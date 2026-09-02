import type { Clock } from '@rahrow/core/connection/connection-controller.ts'
import { EngineError } from '@rahrow/core/errors.ts'

import type { XrayConfig } from '../xray/xray-engine.ts'

export type EngineProcessLogStream = 'stdout' | 'stderr'

export interface EngineProcessLogEntry {
	readonly stream: EngineProcessLogStream
	readonly line: string
	readonly observedAt: string
}

export interface EngineProcessExit {
	readonly code: number | null
	readonly signal?: string
}

export interface EngineProcessStopInput {
	readonly timeoutMs: number
}

export interface ManagedEngineProcessHandle {
	readonly pid?: number
	stop(input: EngineProcessStopInput): Promise<void>
	kill(): Promise<void>
	exited(): Promise<EngineProcessExit | undefined>
	logs(): readonly EngineProcessLogEntry[]
}

export interface EngineProcessSpawnInput<TConfig = unknown> {
	readonly binaryPath: string
	readonly args: readonly string[]
	readonly config: TConfig
	readonly configText: string
}

export interface EngineProcessSpawner<TConfig = unknown> {
	assertExecutable(binaryPath: string): Promise<void>
	spawn(
		input: EngineProcessSpawnInput<TConfig>,
	): Promise<ManagedEngineProcessHandle>
}

export interface EngineConfigValidator<TConfig> {
	validate(config: TConfig): void
}

export interface XrayConfigValidator
	extends EngineConfigValidator<XrayConfig> {}

export interface ManagedEngineProcessOptions<TConfig> {
	readonly binaryPath?: string
	readonly resolveBinaryPath?: () => Promise<string>
	readonly spawner: EngineProcessSpawner<TConfig>
	readonly configValidator?: EngineConfigValidator<TConfig>
	readonly engineName?: string
	readonly stopTimeoutMs?: number
}

const defaultStopTimeoutMs = 5000

export class ManagedEngineProcess<TConfig = unknown> {
	#active: ManagedEngineProcessHandle | undefined
	#logs: readonly EngineProcessLogEntry[] = []

	constructor(private readonly options: ManagedEngineProcessOptions<TConfig>) {}

	get logs(): readonly EngineProcessLogEntry[] {
		return this.#logs
	}

	async start(config: TConfig): Promise<void> {
		await this.clearExitedProcess()
		if (this.#active) {
			throw new EngineError(
				'engine_already_running',
				`${this.engineName} is already running`,
			)
		}

		try {
			this.options.configValidator?.validate(config)
			const binaryPath =
				this.options.binaryPath ??
				(this.options.resolveBinaryPath
					? await this.options.resolveBinaryPath()
					: undefined)
			if (!binaryPath) {
				throw new EngineError(
					'engine_start_failed',
					`${this.engineName} binary path was not resolved`,
				)
			}

			await this.options.spawner.assertExecutable(binaryPath)
			const handle = await this.options.spawner.spawn({
				binaryPath,
				args: ['run', '-config', 'stdin:'],
				config,
				configText: stableJson(config),
			})
			this.captureLogs(handle)

			const exit = await handle.exited()
			if (exit) {
				throw new EngineError(
					'engine_start_failed',
					`${this.engineName} exited during startup with code ${exit.code ?? 'unknown'}`,
				)
			}

			this.#active = handle
		} catch (error) {
			this.#active = undefined
			throw toEngineError(
				'engine_start_failed',
				`${this.engineName} failed to start`,
				error,
			)
		}
	}

	async stop(): Promise<void> {
		const handle = this.#active
		if (!handle) {
			return
		}

		try {
			await handle.stop({
				timeoutMs: this.options.stopTimeoutMs ?? defaultStopTimeoutMs,
			})
			this.captureLogs(handle)
			this.#active = undefined
		} catch (error) {
			await handle.kill()
			this.captureLogs(handle)
			this.#active = undefined
			throw toEngineError(
				'engine_stop_failed',
				`${this.engineName} failed to stop`,
				error,
			)
		}
	}

	private async clearExitedProcess() {
		const handle = this.#active
		if (!handle) {
			return
		}

		const exit = await handle.exited()
		if (!exit) {
			return
		}

		this.captureLogs(handle)
		this.#active = undefined
	}

	private captureLogs(handle: ManagedEngineProcessHandle) {
		this.#logs = handle.logs()
	}

	private get engineName(): string {
		return this.options.engineName ?? 'Engine'
	}
}

export class BasicXrayConfigValidator implements XrayConfigValidator {
	validate(config: XrayConfig): void {
		if (config.inbounds.length === 0 || config.outbounds.length === 0) {
			throw new EngineError(
				'invalid_config',
				'Xray config requires at least one inbound and one outbound',
			)
		}

		for (const inbound of config.inbounds) {
			if (inbound.protocol === 'tun') {
				continue
			}
			if (
				!Number.isInteger(inbound.port) ||
				inbound.port < 1 ||
				inbound.port > 65535
			) {
				throw new EngineError(
					'invalid_config',
					'Xray inbound port must be an integer from 1 to 65535',
				)
			}
		}
	}
}

export class RuntimeClockLog {
	constructor(private readonly clock: Clock) {}

	entry(stream: EngineProcessLogStream, line: string): EngineProcessLogEntry {
		return {
			stream,
			line,
			observedAt: this.clock.now(),
		}
	}
}

function stableJson(input: unknown): string {
	return JSON.stringify(sortJson(input))
}

function sortJson(input: unknown): unknown {
	if (Array.isArray(input)) {
		return input.map(sortJson)
	}

	if (!isRecord(input)) {
		return input
	}

	return Object.fromEntries(
		Object.entries(input)
			.filter(([, value]) => value !== undefined)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, value]) => [key, sortJson(value)]),
	)
}

function isRecord(input: unknown): input is Readonly<Record<string, unknown>> {
	return typeof input === 'object' && input !== null
}

function toEngineError(
	code: 'engine_start_failed' | 'engine_stop_failed',
	message: string,
	cause: unknown,
) {
	if (cause instanceof EngineError && cause.code === code) {
		return cause
	}

	return new EngineError(code, errorMessage(cause, message), { cause })
}

function errorMessage(error: unknown, fallback: string) {
	return error instanceof Error ? error.message : fallback
}
