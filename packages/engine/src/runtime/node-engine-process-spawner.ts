import { spawn } from 'node:child_process'
import { access } from 'node:fs/promises'

import type { Clock } from '@rahrow/core/connection/connection-controller.ts'
import { EngineError } from '@rahrow/core/errors.ts'

import { SystemClock } from '../xray/xray-engine.ts'
import {
	type EngineProcessExit,
	type EngineProcessLogEntry,
	type EngineProcessSpawner,
	type EngineProcessStopInput,
	type ManagedEngineProcessHandle,
	RuntimeClockLog,
} from './managed-engine-process.ts'

export interface NodeEngineChild {
	readonly pid?: number
	readonly stdin: {
		write(data: string, callback?: (error?: Error | null) => void): unknown
		end(): void
	} | null
	readonly stdout: {
		on(event: 'data', listener: (chunk: unknown) => void): unknown
	} | null
	readonly stderr: {
		on(event: 'data', listener: (chunk: unknown) => void): unknown
	} | null
	readonly exitCode: number | null
	readonly signalCode: NodeJS.Signals | null
	kill(signal?: NodeJS.Signals): boolean
	on(event: 'exit' | 'error', listener: (...args: unknown[]) => void): unknown
	once(event: 'exit' | 'error', listener: (...args: unknown[]) => void): unknown
}

export type NodeEngineSpawnFn = (
	command: string,
	args: readonly string[],
	options: { readonly stdio: ['pipe', 'pipe', 'pipe'] },
) => NodeEngineChild

export interface NodeEngineProcessSpawnerOptions {
	readonly spawn?: NodeEngineSpawnFn
	readonly access?: (path: string) => Promise<void>
	readonly clock?: Clock
}

export function createNodeEngineProcessSpawner<TConfig = unknown>(
	options: NodeEngineProcessSpawnerOptions = {},
): EngineProcessSpawner<TConfig> {
	const spawnProcess = options.spawn ?? (spawn as NodeEngineSpawnFn)
	const accessPath = options.access ?? ((path: string) => access(path))
	const clock = options.clock ?? new SystemClock()

	return {
		async assertExecutable(binaryPath) {
			try {
				await accessPath(binaryPath)
			} catch (error) {
				throw new EngineError(
					'engine_start_failed',
					`Engine binary is not executable: ${binaryPath}`,
					{ cause: error },
				)
			}
		},
		async spawn(input) {
			const child = spawnProcess(input.binaryPath, input.args, {
				stdio: ['pipe', 'pipe', 'pipe'],
			})
			const handle = new NodeManagedEngineProcessHandle(child, clock)
			await writeStdin(child, input.configText)

			return handle
		},
	}
}

class NodeManagedEngineProcessHandle implements ManagedEngineProcessHandle {
	readonly pid?: number
	#logs: EngineProcessLogEntry[] = []
	#exit: EngineProcessExit | undefined
	#stdoutBuffer = ''
	#stderrBuffer = ''
	readonly #log: RuntimeClockLog

	constructor(
		private readonly child: NodeEngineChild,
		clock: Clock,
	) {
		this.pid = child.pid
		this.#log = new RuntimeClockLog(clock)
		this.#attach('stdout', child.stdout)
		this.#attach('stderr', child.stderr)
		child.on('exit', (code, signal) => {
			this.#flush('stdout')
			this.#flush('stderr')
			this.#exit = {
				code: typeof code === 'number' ? code : null,
				...(typeof signal === 'string' ? { signal } : {}),
			}
		})
	}

	async stop(input: EngineProcessStopInput): Promise<void> {
		if (this.#currentExit()) {
			return
		}

		await new Promise<void>((resolve, reject) => {
			const timer = setTimeout(() => {
				this.child.kill('SIGKILL')
				reject(new Error(`Engine did not stop within ${input.timeoutMs}ms`))
			}, input.timeoutMs)

			this.child.once('exit', () => {
				clearTimeout(timer)
				resolve()
			})
			this.child.kill('SIGTERM')
		})
	}

	async kill(): Promise<void> {
		this.child.kill('SIGKILL')
	}

	async exited(): Promise<EngineProcessExit | undefined> {
		return this.#currentExit()
	}

	logs(): readonly EngineProcessLogEntry[] {
		return this.#logs
	}

	#currentExit(): EngineProcessExit | undefined {
		if (this.#exit) {
			return this.#exit
		}

		if (this.child.exitCode !== null || this.child.signalCode) {
			return {
				code: this.child.exitCode,
				...(this.child.signalCode ? { signal: this.child.signalCode } : {}),
			}
		}

		return undefined
	}

	#attach(stream: 'stdout' | 'stderr', readable: NodeEngineChild['stdout']) {
		readable?.on('data', (chunk) => {
			const text = typeof chunk === 'string' ? chunk : bytesToString(chunk)
			if (stream === 'stdout') {
				this.#stdoutBuffer = this.#consume(stream, this.#stdoutBuffer + text)
			} else {
				this.#stderrBuffer = this.#consume(stream, this.#stderrBuffer + text)
			}
		})
	}

	#consume(stream: 'stdout' | 'stderr', text: string): string {
		const lines = text.split('\n')
		const rest = lines.pop() ?? ''

		for (const line of lines) {
			const trimmed = line.replace(/\r$/, '')
			if (trimmed.length === 0) {
				continue
			}

			this.#logs = [...this.#logs, this.#log.entry(stream, trimmed)]
		}

		return rest
	}

	#flush(stream: 'stdout' | 'stderr') {
		const rest = stream === 'stdout' ? this.#stdoutBuffer : this.#stderrBuffer
		if (rest.length === 0) {
			return
		}

		this.#logs = [...this.#logs, this.#log.entry(stream, rest.replace(/\r$/, ''))]
		if (stream === 'stdout') {
			this.#stdoutBuffer = ''
		} else {
			this.#stderrBuffer = ''
		}
	}
}

function writeStdin(child: NodeEngineChild, text: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const stdin = child.stdin
		if (!stdin) {
			reject(
				new EngineError(
					'engine_start_failed',
					'Engine process stdin is not available',
				),
			)

			return
		}

		const onError = (error: unknown) => {
			reject(error)
		}

		child.once('error', onError)
		stdin.write(text, (error) => {
			if (error) {
				reject(error)

				return
			}

			stdin.end()
			resolve()
		})
	})
}

function bytesToString(chunk: unknown): string {
	if (chunk instanceof Uint8Array) {
		return new TextDecoder().decode(chunk)
	}

	return String(chunk)
}
