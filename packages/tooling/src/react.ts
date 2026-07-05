import path from 'node:path'

export function createReactAlias(cwd = process.cwd(), alias = '@') {
	return {
		[alias]: path.join(cwd, 'src'),
	} as const
}
