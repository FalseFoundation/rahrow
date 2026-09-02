import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { defineConfig, mergeConfig, type ViteUserConfig } from 'vitest/config'

const workspaceRoot = fileURLToPath(new URL('../../..', import.meta.url))

export function createVitestConfig(
	config: ViteUserConfig = {},
): ViteUserConfig {
	return mergeConfig(
		defineConfig({
			resolve: {
				alias: [
					{
						find: /^@rahrow\/core\/(.*)$/,
						replacement: path.join(workspaceRoot, 'packages/core/src/$1'),
					},
					{
						find: /^@rahrow\/engine\/(.*)$/,
						replacement: path.join(workspaceRoot, 'packages/engine/src/$1'),
					},
					{
						find: /^@rahrow\/features\/(.*)$/,
						replacement: path.join(workspaceRoot, 'packages/features/src/$1'),
					},
					{
						find: /^@rahrow\/ui\/(.*)$/,
						replacement: path.join(workspaceRoot, 'packages/ui/src/$1'),
					},
				],
			},
			test: {
				environment: 'node',
				clearMocks: true,
				restoreMocks: true,
				unstubEnvs: true,
				unstubGlobals: true,
			},
		}),
		defineConfig(config),
	)
}
