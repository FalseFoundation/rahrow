import { createVitestConfig } from '@rahrow/tooling/vitest.ts'

export default createVitestConfig({
	test: {
		name: '@rahrow/ads',
		include: ['src/**/*.test.ts'],
	},
})
