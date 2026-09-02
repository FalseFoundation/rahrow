import { spawn } from 'node:child_process'
import { exit } from 'node:process'
import { fileURLToPath } from 'node:url'

import { EngineError } from '@rahrow/core/errors.ts'
import {
	SING_BOX_BINARY_ENV,
	XRAY_BINARY_ENV,
} from '@rahrow/engine/runtime/engine-runtime-resolver.ts'

import { ensureHostEngineRuntime } from './engine-runtime-fs.ts'

const desktopRoot = fileURLToPath(new URL('..', import.meta.url))

async function main() {
	const [xray, singBox] = await Promise.all([
		ensureHostEngineRuntime('xray'),
		ensureHostEngineRuntime('sing-box'),
	])
	const child = spawn(
		'pnpm',
		['exec', 'tauri', 'dev', ...process.argv.slice(2)],
		{
			cwd: desktopRoot,
			env: {
				...process.env,
				[XRAY_BINARY_ENV]: xray.binaryPath,
				[SING_BOX_BINARY_ENV]: singBox.binaryPath,
			},
			stdio: 'inherit',
		},
	)

	const forward = (signal: NodeJS.Signals) => {
		if (!child.killed) child.kill(signal)
	}
	process.on('SIGINT', () => forward('SIGINT'))
	process.on('SIGTERM', () => forward('SIGTERM'))
	child.on('exit', (code, signal) => exit(signal ? 1 : (code ?? 1)))
}

main().catch((error: unknown) => {
	const message =
		error instanceof EngineError
			? `${error.code}: ${error.message}`
			: error instanceof Error
				? error.message
				: 'Failed to prepare desktop engine runtimes'
	console.error(message)
	exit(1)
})
