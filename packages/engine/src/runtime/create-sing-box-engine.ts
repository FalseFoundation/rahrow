import { spawn as nodeSpawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
	constants,
	access as nodeAccess,
	readFile as nodeReadFile,
} from 'node:fs/promises'
import { arch, platform as osPlatform, env as processEnv } from 'node:process'

import type { Clock } from '@rahrow/core/connection/connection-controller.ts'
import { EngineError } from '@rahrow/core/errors.ts'
import type { Logger } from '@rahrow/core/logging/logger.ts'
import {
	type SingBoxConfig,
	SingBoxConfigBuilder,
	SingBoxEngine,
	type SingBoxLatencyProbe,
	type SingBoxProcess,
} from '../sing-box/sing-box-engine.ts'
import type { EngineRuntimePlatform } from './engine-runtime-manifest.ts'
import {
	defaultEngineRuntimeDir,
	detectEngineRuntimePlatform,
	type EngineRuntimeFileAccess,
	loadEngineRuntimeManifest,
	resolveEngineRuntimeBinary,
} from './engine-runtime-resolver.ts'
import { TcpLatencyProbe } from './tcp-latency-probe.ts'

export { SING_BOX_BINARY_ENV } from './engine-runtime-resolver.ts'

export interface SingBoxChildProcess {
	readonly stdin: {
		write(value: string, callback?: (error?: Error | null) => void): unknown
		end(): void
	} | null
	readonly exitCode: number | null
	readonly signalCode: NodeJS.Signals | null
	kill(signal?: NodeJS.Signals): boolean
	on(event: 'error' | 'exit', listener: (...args: unknown[]) => void): unknown
	once(event: 'error' | 'exit', listener: (...args: unknown[]) => void): unknown
}

export type SingBoxSpawn = (
	command: string,
	args: readonly string[],
	options: { readonly stdio: ['pipe', 'pipe', 'pipe'] },
) => SingBoxChildProcess

export interface CreateSingBoxEngineOptions {
	readonly process?: SingBoxProcess
	readonly binaryPath?: string
	readonly resolveBinaryPath?: () => Promise<string>
	readonly env?: Readonly<Record<string, string | undefined>>
	readonly platform?: EngineRuntimePlatform
	readonly runtimeDir?: string
	readonly files?: EngineRuntimeFileAccess
	readonly hashSha256?: (bytes: Uint8Array) => string | Promise<string>
	readonly access?: (path: string) => Promise<void>
	readonly spawn?: SingBoxSpawn
	readonly stopTimeoutMs?: number
	readonly latencyProbe?: SingBoxLatencyProbe
	readonly clock?: Clock
	readonly logger?: Logger
}

export function createSingBoxEngine(
	options: CreateSingBoxEngineOptions = {},
): SingBoxEngine {
	const latencyProbe = options.latencyProbe ?? new TcpLatencyProbe()

	if (options.process) {
		return new SingBoxEngine(
			options.process,
			new SingBoxConfigBuilder(),
			latencyProbe,
			options.clock,
			options.logger,
		)
	}

	return new SingBoxEngine(
		new NodeSingBoxProcess(options),
		new SingBoxConfigBuilder(),
		latencyProbe,
		options.clock,
		options.logger,
	)
}

class NodeSingBoxProcess implements SingBoxProcess {
	#active: SingBoxChildProcess | undefined

	constructor(private readonly options: CreateSingBoxEngineOptions) {}

	async start(config: SingBoxConfig): Promise<void> {
		if (this.#active && this.#active.exitCode === null) {
			throw new EngineError(
				'engine_already_running',
				'sing-box is already running',
			)
		}

		this.#active = undefined
		const binaryPath = await resolveBinaryPath(this.options)
		const access =
			this.options.access ?? ((path: string) => nodeAccess(path, constants.X_OK))

		try {
			await access(binaryPath)
		} catch (error) {
			throw new EngineError(
				'engine_start_failed',
				`sing-box binary is not executable: ${binaryPath}`,
				{ cause: error },
			)
		}

		const spawn = this.options.spawn ?? (nodeSpawn as SingBoxSpawn)
		let child: SingBoxChildProcess

		try {
			child = spawn(binaryPath, ['run', '-c', 'stdin'], {
				stdio: ['pipe', 'pipe', 'pipe'],
			})
			child.on('error', () => {
				if (this.#active === child) {
					this.#active = undefined
				}
			})
			child.on('exit', () => {
				if (this.#active === child) {
					this.#active = undefined
				}
			})
			await writeConfig(child, stableJson(config))
		} catch (error) {
			throw new EngineError(
				'engine_start_failed',
				error instanceof Error ? error.message : 'Failed to start sing-box',
				{ cause: error },
			)
		}

		if (child.exitCode !== null) {
			throw new EngineError(
				'engine_start_failed',
				`sing-box exited during startup with code ${child.exitCode}`,
			)
		}

		this.#active = child
	}

	async stop(): Promise<void> {
		const child = this.#active
		if (!child || child.exitCode !== null) {
			this.#active = undefined
			return
		}

		const timeoutMs = this.options.stopTimeoutMs ?? 5000
		try {
			await new Promise<void>((resolve, reject) => {
				const timer = setTimeout(() => {
					child.kill('SIGKILL')
					reject(new Error(`sing-box did not stop within ${timeoutMs}ms`))
				}, timeoutMs)

				child.once('exit', () => {
					clearTimeout(timer)
					resolve()
				})
				child.once('error', (error) => {
					clearTimeout(timer)
					reject(error)
				})
				child.kill('SIGTERM')
			})
		} finally {
			this.#active = undefined
		}
	}
}

async function resolveBinaryPath(
	options: CreateSingBoxEngineOptions,
): Promise<string> {
	if (options.binaryPath) return options.binaryPath
	if (options.resolveBinaryPath) return options.resolveBinaryPath()

	const runtimeDir = options.runtimeDir ?? defaultEngineRuntimeDir('sing-box')
	const files = options.files ?? nodeRuntimeFiles
	const manifest = await loadEngineRuntimeManifest(runtimeDir, files)
	const resolved = await resolveEngineRuntimeBinary({
		manifest,
		env: options.env ?? processEnv,
		platform: options.platform ?? detectEngineRuntimePlatform(osPlatform, arch),
		runtimeDir,
		files,
		hashSha256:
			options.hashSha256 ??
			((bytes) => createHash('sha256').update(bytes).digest('hex')),
	})
	return resolved.binaryPath
}

const nodeRuntimeFiles: EngineRuntimeFileAccess = {
	async exists(path) {
		try {
			await nodeAccess(path)
			return true
		} catch {
			return false
		}
	},
	readFile: (path) => nodeReadFile(path),
}

function writeConfig(child: SingBoxChildProcess, configText: string) {
	if (!child.stdin) {
		throw new Error('sing-box process stdin is unavailable')
	}

	return new Promise<void>((resolve, reject) => {
		child.stdin?.write(configText, (error) => {
			if (error) {
				reject(error)
				return
			}

			child.stdin?.end()
			resolve()
		})
	})
}

function stableJson(input: unknown): string {
	return JSON.stringify(sortJson(input))
}

function sortJson(input: unknown): unknown {
	if (Array.isArray(input)) {
		return input.map(sortJson)
	}

	if (typeof input !== 'object' || input === null) {
		return input
	}

	return Object.fromEntries(
		Object.entries(input)
			.filter(([, value]) => value !== undefined)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, value]) => [key, sortJson(value)]),
	)
}
