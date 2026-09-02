import { Button } from '@rahrow/ui/components/ui/button.tsx'
import {
	createHashHistory,
	createRootRouteWithContext,
	createRoute,
	createRouter,
	lazyRouteComponent,
} from '@tanstack/react-router'

import { AppShellLayout } from './AppShellLayout.tsx'
import { useAppTranslation } from './app-i18n.tsx'
import { ProductHeader } from './ProductHeader.tsx'
import styles from './router.module.css'
import type { AppRuntime } from './runtime.tsx'

interface RouterContext {
	readonly runtime: AppRuntime
}

const rootRoute = createRootRouteWithContext<RouterContext>()({
	component: AppShellLayout,
})

const homeRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/',
	component: lazyRouteComponent(() => import('../home/Home.tsx'), 'Home'),
	pendingComponent: RouteLoadingFallback,
	errorComponent: RouteErrorFallback,
})

const profilesRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/profiles',
	component: lazyRouteComponent(
		() => import('../profiles/Profiles.tsx'),
		'Profiles',
	),
	pendingComponent: RouteLoadingFallback,
	errorComponent: RouteErrorFallback,
})

const subscriptionsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/subscriptions',
	component: lazyRouteComponent(
		() => import('../subscriptions/Subscriptions.tsx'),
		'Subscriptions',
	),
	pendingComponent: RouteLoadingFallback,
	errorComponent: RouteErrorFallback,
})

const importRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/import',
	component: lazyRouteComponent(() => import('../import/Import.tsx'), 'Import'),
	pendingComponent: RouteLoadingFallback,
	errorComponent: RouteErrorFallback,
})

const settingsRoute = createRoute({
	getParentRoute: () => rootRoute,
	path: '/settings',
	validateSearch: (search: Record<string, unknown>) => ({
		drawer:
			search.drawer === 'diagnostics' ? ('diagnostics' as const) : undefined,
	}),
	component: lazyRouteComponent(
		() => import('../settings/Settings.tsx'),
		'Settings',
	),
	pendingComponent: RouteLoadingFallback,
	errorComponent: RouteErrorFallback,
})

const routeTree = rootRoute.addChildren([
	homeRoute,
	profilesRoute,
	subscriptionsRoute,
	importRoute,
	settingsRoute,
])

export function createAppRouter(runtime: AppRuntime) {
	return createRouter({
		routeTree,
		history: createHashHistory(),
		context: { runtime },
	})
}

export function RouteLoadingFallback() {
	const { t } = useAppTranslation()
	return (
		<>
			<ProductHeader title={t('route.loading.title')} />
			<section className={styles.routeState}>
				<div role='status' aria-live='polite' aria-atomic='true'>
					<span className={styles.srOnly}>{t('route.loading.title')}</span>
					<p>{t('route.loading.description')}</p>
				</div>
			</section>
		</>
	)
}

export function RouteErrorFallback({
	onReload = () => window.location.reload(),
}: {
	readonly onReload?: () => void
}) {
	const { t } = useAppTranslation()
	return (
		<>
			<ProductHeader title={t('route.error.title')} />
			<section className={styles.routeState}>
				<div role='alert' aria-atomic='true'>
					<span className={styles.srOnly}>{t('route.error.title')}</span>
					<p>{t('route.error.description')}</p>
				</div>
				<div className={styles.routeActions}>
					<Button type='button' onClick={onReload}>
						{t('route.error.reload')}
					</Button>
					<a className={styles.routeLink} href='#/settings?drawer=diagnostics'>
						{t('route.error.diagnostics')}
					</a>
				</div>
			</section>
		</>
	)
}
