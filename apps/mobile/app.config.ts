import { arkUiPackages } from '@rahrow/tooling/ark'
import { createExpoAppConfig } from '@rahrow/tooling/expo'

const config = createExpoAppConfig({
	name: 'RahRow Mobile',
	slug: 'rahrow-mobile',
	scheme: 'rahrow-mobile',
	platform: {
		bundleIdentifier: 'foundation.false.rahrow.mobile',
		packageName: 'foundation.false.rahrow.mobile',
	},
})

export default {
	...config,
	expo: {
		...config.expo,
		extra: {
			arkUi: arkUiPackages.reactNative,
		},
	},
}
