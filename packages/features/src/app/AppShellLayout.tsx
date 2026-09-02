import {
	BackIcon,
	HomeIcon,
	SettingsIcon,
	WifiIcon,
} from '@rahrow/ui/components/rahrow-icons.tsx'
import { Button } from '@rahrow/ui/components/ui/button.tsx'
import { ScrollArea } from '@rahrow/ui/components/ui/scroll-area.tsx'
import { Outlet, useNavigate, useRouterState } from '@tanstack/react-router'
import { useRef } from 'react'
import { AppHeaderSlot } from './AppHeaderSlot.tsx'
import styles from './AppShellLayout.module.css'
import { useAppTranslation } from './app-i18n.tsx'
import { AppScrollProvider } from './app-scroll-context.tsx'
import { nestedRouteParent, primaryPathFor } from './navigation-model.ts'

const PRIMARY_NAVIGATION = [
	{ path: '/', titleKey: 'app.screens.home', icon: HomeIcon },
	{ path: '/profiles', titleKey: 'app.screens.profiles', icon: WifiIcon },
	{ path: '/settings', titleKey: 'app.screens.settings', icon: SettingsIcon },
] as const

export function AppShellLayout() {
	const { t } = useAppTranslation()
	const navigate = useNavigate()
	const viewportRef = useRef<HTMLDivElement>(null)
	const pathname = useRouterState({
		select: (state) => state.location.pathname,
	})

	const backTarget = nestedRouteParent(pathname)
	const activePrimaryPath = primaryPathFor(pathname)

	return (
		<AppScrollProvider viewportRef={viewportRef}>
			<div className={styles.shell} data-app-shell>
				<AppHeaderSlot className={styles.headerSlot}>
					<ScrollArea className={styles.appScroll} viewportRef={viewportRef}>
						<main className={styles.main} data-app-scroll-body>
							<Outlet />
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
