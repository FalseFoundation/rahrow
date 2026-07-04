import { defineConfig } from 'vitest/config'

export default defineConfig({
	test: {
		name: 'rahrow',
		environment: 'node',
		include: ['apps/**/*.test.{ts,tsx}', 'packages/**/*.test.{ts,tsx}', 'tests/**/*.test.{ts,tsx}'],
		clearMocks: true,
		restoreMocks: true,
		unstubEnvs: true,
		unstubGlobals: true,
	},
})
