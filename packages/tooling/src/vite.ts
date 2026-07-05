import { defineConfig, mergeConfig, type UserConfig } from 'vite'

export function createViteConfig(config: UserConfig = {}): UserConfig {
	return mergeConfig(
		defineConfig({
			define: {
				'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
			},
			build: {
				sourcemap: process.env.NODE_ENV !== 'production',
				minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
			},
			server: {
				hmr: true,
			},
		}),
		defineConfig(config),
	)
}
