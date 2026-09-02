export const PRIMARY_PATHS = ['/', '/profiles', '/settings'] as const

export type PrimaryPath = (typeof PRIMARY_PATHS)[number]

const NESTED_ROUTE_PARENTS: Readonly<Record<string, PrimaryPath>> = {
	'/import': '/profiles',
	'/subscriptions': '/profiles',
}

export function nestedRouteParent(pathname: string): PrimaryPath | undefined {
	return NESTED_ROUTE_PARENTS[pathname]
}

export function primaryPathFor(pathname: string): PrimaryPath {
	if (pathname === '/' || pathname === '/profiles' || pathname === '/settings') {
		return pathname
	}

	return pathname === '/subscriptions' || pathname === '/import'
		? '/profiles'
		: '/settings'
}
