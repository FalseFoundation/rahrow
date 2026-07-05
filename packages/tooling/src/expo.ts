export interface ExpoPlatformConfig {
	bundleIdentifier: string
	packageName: string
}

export interface ExpoAppConfigOptions {
	name: string
	slug: string
	scheme: string
	platform: ExpoPlatformConfig
}

export function createExpoAppConfig(options: ExpoAppConfigOptions) {
	return {
		expo: {
			name: options.name,
			slug: options.slug,
			scheme: options.scheme,
			plugins: ['expo-router'],
			experiments: {
				typedRoutes: true,
			},
			ios: {
				bundleIdentifier: options.platform.bundleIdentifier,
			},
			android: {
				package: options.platform.packageName,
			},
			web: {
				bundler: 'metro',
			},
		},
	} as const
}
