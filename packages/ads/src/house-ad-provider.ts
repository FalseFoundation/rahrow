import type { AdCreative, AdProvider } from './ad-provider.ts'

export function createHouseAdProvider(creative: AdCreative): AdProvider {
	return {
		id: 'house',
		async load() {
			return { kind: 'embedded', creative }
		},
	}
}

export function createDevelopmentAdProvider(): AdProvider {
	return {
		...createHouseAdProvider({
			sponsor: 'RahRow development build',
			headline: 'Test advertisement',
			body: 'This message confirms that the advertising gate is working.',
		}),
		id: 'house-development',
	}
}
