import {
	createReactAlias,
	createReactViteConfig,
} from '@rahrow/tooling/react.ts'
import { createTauriViteConfig } from '@rahrow/tooling/tauri.ts'

import { webBundleBudgetPlugin, webManualChunks } from '../bundle-policy.ts'

export default createTauriViteConfig(
	createReactViteConfig({
		build: {
			target: 'es2022',
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
	}),
)
