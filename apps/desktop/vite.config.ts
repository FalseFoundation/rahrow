import react from '@vitejs/plugin-react'
import { createReactAlias } from '@rahrow/tooling/react'
import { createTauriViteConfig } from '@rahrow/tooling/tauri'
import { createViteConfig } from '@rahrow/tooling/vite'

export default createTauriViteConfig(
	createViteConfig({
		plugins: [react()],
		resolve: {
			alias: createReactAlias(process.cwd()),
		},
	}),
)
