import { createVitestConfig } from '@rahrow/tooling/vitest.ts'
import { defineProject, mergeConfig, type ViteUserConfig } from 'vitest/config'

const sharedConfig = createVitestConfig()

export default mergeConfig(
	sharedConfig,
	defineProject({
		test: {
			name: '@rahrow/cli',
			include: ['src/**/*.test.{ts,tsx}'],
		},
	}) as ViteUserConfig,
)
