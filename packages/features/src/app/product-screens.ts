export interface ProductScreen {
	readonly id: 'home' | 'profiles' | 'subscriptions' | 'import' | 'settings'
	readonly path: '/' | '/profiles' | '/subscriptions' | '/import' | '/settings'
	readonly title: string
}

export const PRODUCT_SCREENS = [
	{ id: 'home', path: '/', title: 'Home' },
	{ id: 'profiles', path: '/profiles', title: 'Profiles' },
	{ id: 'subscriptions', path: '/subscriptions', title: 'Subscriptions' },
	{ id: 'import', path: '/import', title: 'Import' },
	{ id: 'settings', path: '/settings', title: 'Settings' },
] as const satisfies readonly ProductScreen[]
