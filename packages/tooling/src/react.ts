import path from 'node:path'
import babel from '@rolldown/plugin-babel'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import type { UserConfig } from 'vite'
import { createViteConfig } from './vite.ts'

export function createReactAlias(cwd = process.cwd(), alias = '@') {
	return {
		[alias]: path.join(cwd, 'src'),
	} as const
}

export function createReactViteConfig(config: UserConfig = {}): UserConfig {
	return createViteConfig({
		...config,
		plugins: [
			react(),
			babel({ presets: [reactCompilerPreset()] }),
			...(config.plugins ?? []),
		],
	})
}
