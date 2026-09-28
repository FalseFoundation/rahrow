import { defineConfig } from '@taskset/cli'

export default defineConfig({
	project: {
		name: 'rahrow',
	},
	tasks: {
		defaults: {
			status: 'todo',
			labels: [],
		},
		statuses: ['todo', 'doing', 'blocked', 'done', 'canceled'],
		priorities: ['low', 'medium', 'high', 'urgent'],
	},
})
