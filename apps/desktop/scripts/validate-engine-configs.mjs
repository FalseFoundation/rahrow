import { spawn } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const vitest = join(
	dirname(fileURLToPath(import.meta.resolve('vitest'))),
	'..',
	'vitest.mjs',
)
const child = spawn(
	process.execPath,
	[vitest, 'run', 'src/lib/engine-config-validation.integration.test.ts'],
	{
		stdio: 'inherit',
		env: { ...process.env, RAHROW_VALIDATE_BUNDLED_ENGINES: '1' },
	},
)

child.on('error', (error) => {
	console.error(error)
	process.exitCode = 1
})
child.on('exit', (code) => {
	process.exitCode = code ?? 1
})
