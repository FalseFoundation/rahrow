import {
	createReactAlias,
	createReactViteConfig,
} from '@rahrow/tooling/react.ts'

import { webBundleBudgetPlugin, webManualChunks } from '../bundle-policy.ts'

export default createReactViteConfig({
	build: {
		rollupOptions: {
			output: { manualChunks: webManualChunks },
		},
	},
	plugins: [webBundleBudgetPlugin()],
	resolve: {
		alias: {
			...createReactAlias(process.cwd()),
			pino: 'pino/browser.js',
		},
	},
})
