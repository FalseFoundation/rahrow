import {
	BackIcon,
	HomeIcon,
	SettingsIcon,
	WifiIcon,
} from '@rahrow/ui/components/rahrow-icons.tsx'
import { Button } from '@rahrow/ui/components/ui/button.tsx'
import { ScrollArea } from '@rahrow/ui/components/ui/scroll-area.tsx'
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useRef,
	useState,
	type ReactNode,
} from 'react'
import { AppHeaderSlot } from './AppHeaderSlot.tsx'
import styles from './AppShellLayout.module.css'
import { useAppTranslation } from './app-i18n.tsx'
import {
	APP_SCROLL_RESTORATION_ID,
	AppScrollProvider,
} from './app-scroll-context.tsx'
import {
	nestedRouteParent,
	PRIMARY_PATHS,
	type PrimaryPath,
	primaryPathFor,
} from './navigation-model.ts'
import { PrimaryTabVisibilityProvider } from './primary-tab-visibility.tsx'
import { ProductHeader } from './ProductHeader.tsx'
import {
	ScreenLoadingState,
	type ScreenLoadingVariant,
} from './ScreenLoadingState.tsx'

const Home = lazy(() =>
	import('../home/Home.tsx').then((module) => ({ default: module.Home })),
)
const Profiles = lazy(() =>
	import('../profiles/Profiles.tsx').then((module) => ({
		default: module.Profiles,
	})),
)
const Settings = lazy(() =>
	import('../settings/Settings.tsx').then((module) => ({
		default: module.Settings,
	})),
)

const PRIMARY_NAVIGATION = [
	{ path: '/', titleKey: 'app.screens.home', icon: HomeIcon },
	{ path: '/profiles', titleKey: 'app.screens.profiles', icon: WifiIcon },
	{ path: '/settings', titleKey: 'app.screens.settings', icon: SettingsIcon },
] as const

const PRIMARY_TAB_LOADING: Record<PrimaryPath, ScreenLoadingVariant> = {
	'/': 'home',
	'/profiles': 'connections',
	'/settings': 'settings',
}

function PrimaryTabSuspenseFallback({
	variant,
}: {
	readonly variant: ScreenLoadingVariant
}) {
	const { t } = useAppTranslation()
	return (
		<>
			<ProductHeader title={t('route.loading.title')} />
			<ScreenLoadingState label={t('route.loading.title')} variant={variant} />
		</>
	)
}

const PRIMARY_TAB_PANEL: Record<
	PrimaryPath,
	{ readonly screen: ReactNode; readonly loading: ScreenLoadingVariant }
> = {
	'/': { screen: <Home />, loading: PRIMARY_TAB_LOADING['/'] },
	'/profiles': {
		screen: <Profiles />,
		loading: PRIMARY_TAB_LOADING['/profiles'],
	},
	'/settings': {
		screen: <Settings />,
		loading: PRIMARY_TAB_LOADING['/settings'],
	},
}

export function AppShellLayout() {
	const { t } = useAppTranslation()
	const navigate = useNavigate()
	const viewportRef = useRef<HTMLDivElement>(null)
	const setViewportRef = useCallback((node: HTMLDivElement | null) => {
		viewportRef.current = node
		if (node) {
			node.setAttribute('data-scroll-restoration-id', APP_SCROLL_RESTORATION_ID)
			node.setAttribute('data-app-scroll-viewport', '')
		}
	}, [])
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	})

	const backTarget = nestedRouteParent(pathname)
	const activePrimaryPath = primaryPathFor(pathname)
	const showingPrimaryTabs = backTarget === undefined
	const [mountedPrimaryTabs, setMountedPrimaryTabs] = useState(
		() => new Set<PrimaryPath>([activePrimaryPath]),
	)

	useEffect(() => {
		if (!showingPrimaryTabs) return
		setMountedPrimaryTabs((current) => {
			if (current.has(activePrimaryPath)) return current
			const next = new Set(current)
			next.add(activePrimaryPath)
			return next
		})
	}, [activePrimaryPath, showingPrimaryTabs])

	return (
		<AppScrollProvider viewportRef={viewportRef}>
			<div className={styles.shell} data-app-shell>
				<AppHeaderSlot className={styles.headerSlot}>
					<ScrollArea className={styles.appScroll} viewportRef={setViewportRef}>
						<main className={styles.main} data-app-scroll-body>
							{PRIMARY_PATHS.map((path) => {
								if (!mountedPrimaryTabs.has(path)) return null
								const active = showingPrimaryTabs && activePrimaryPath === path
								const panel = PRIMARY_TAB_PANEL[path]
								return (
									<PrimaryTabVisibilityProvider key={path} active={active}>
										<div
											className={styles.primaryTab}
											data-primary-tab={path}
											data-active={active}
											hidden={!active}
											inert={!active ? true : undefined}
										>
											<Suspense
												fallback={
													<PrimaryTabSuspenseFallback variant={panel.loading} />
												}
											>
												{panel.screen}
											</Suspense>
										</div>
									</PrimaryTabVisibilityProvider>
								)
							})}
							{showingPrimaryTabs ? null : <Outlet />}
						</main>
					</ScrollArea>
				</AppHeaderSlot>
				<nav
					className={styles.nav}
					aria-label={
						backTarget ? t('app.navigation.back') : t('app.navigation.primary')
					}
					data-nested={Boolean(backTarget)}
				>
					{backTarget ? (
						<Button
							variant='navigation'
							size='tab'
							className={styles.backButton}
							type='button'
							onClick={() => void navigate({ to: backTarget })}
						>
							<BackIcon data-icon='inline-start' />
							<span>{t('app.navigation.back')}</span>
						</Button>
					) : (
						PRIMARY_NAVIGATION.map((screen) => {
							const active = activePrimaryPath === screen.path
							const Icon = screen.icon
							return (
								<Button
									variant='navigation'
									size='tab'
									data-active={active}
									key={screen.path}
									type='button'
									onClick={() => void navigate({ to: screen.path })}
									aria-current={active ? 'page' : undefined}
								>
									<Icon data-icon='inline-start' strokeWidth={active ? 2 : 1.8} />
									<span>{t(screen.titleKey)}</span>
								</Button>
							)
						})
					)}
				</nav>
			</div>
		</AppScrollProvider>
	)
}
