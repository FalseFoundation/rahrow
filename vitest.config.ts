import { createVitestConfig } from '@rahrow/tooling/vitest.ts'

export default createVitestConfig({
	test: {
		projects: [
			'apps/cli',
			'apps/desktop',
			'apps/mobile',
			'packages/ads',
			'packages/core',
			'packages/engine',
			'packages/features',
			'packages/ui',
			{
				extends: true,
				test: {
					name: 'repo',
					include: ['tests/**/*.test.{ts,tsx}'],
				},
			},
		],
	},
})
