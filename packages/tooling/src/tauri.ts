import { defineConfig, mergeConfig, type UserConfig } from 'vite'

export function createTauriViteConfig(config: UserConfig = {}): UserConfig {
	return mergeConfig(
		defineConfig({
			clearScreen: false,
			envPrefix: ['VITE_', 'TAURI_'],
			server: {
				port: 1420,
				strictPort: true,
			},
			build: {
				target:
					process.env.TAURI_ENV_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
				sourcemap: Boolean(process.env.TAURI_ENV_DEBUG),
				minify: process.env.TAURI_ENV_DEBUG ? false : 'esbuild',
			},
		}),
		defineConfig(config),
	)
}
