import { ConnectionError } from '../errors.ts'
import type { Logger } from '../logging/logger.ts'
import { silentLogger } from '../logging/silent-logger.ts'
import type { ConnectionProfile } from '../profile/connection-profile.ts'
import type {
	EngineStartInput,
	LatencyResult,
	ProxyEngine,
} from '../runtime/proxy-engine.ts'

export type ConnectionState =
	| 'disconnected'
	| 'connecting'
	| 'connected'
	| 'disconnecting'
	| 'error'

export interface Connection {
	readonly profile: ConnectionProfile
	readonly state: ConnectionState
	readonly changedAt: string
	readonly error?: string
}

export interface Clock {
	now(): string
}

export class SystemClock implements Clock {
	now(): string {
		return new Date().toISOString()
	}
}

export type ConnectionListener = (connection: Connection | undefined) => void

export type ConnectionReconfigurationPhase =
	| 'idle'
	| 'queued'
	| 'preparing'
	| 'stopping-old-connection'
	| 'restoring-device-settings'
	| 'initializing-engine'
	| 'applying-vpn'
	| 'applying-system-proxy'
	| 'verifying'
	| 'rolling-back'
	| 'rollback-succeeded'
	| 'error'

export interface ConnectionConfiguration {
	readonly desired?: EngineStartInput
	readonly effective?: EngineStartInput
	readonly phase: ConnectionReconfigurationPhase
	readonly error?: string
}

export type ConnectionConfigurationListener = (
	configuration: ConnectionConfiguration,
) => void

export interface ReconnectPolicy {
	readonly maxAttempts: number
	readonly delayMs: number
}

export interface ConnectionControllerOptions {
	readonly reconnect?: ReconnectPolicy
	readonly wait?: (ms: number) => Promise<void>
	readonly logger?: Logger
}

export class ConnectionController {
	#connection: Connection | undefined
	#configuration: ConnectionConfiguration = { phase: 'idle' }
	#operationTail: Promise<void> = Promise.resolve()
	readonly #listeners = new Set<ConnectionListener>()
	readonly #configurationListeners = new Set<ConnectionConfigurationListener>()
	readonly #logger: Logger

	constructor(
		private readonly engine: ProxyEngine,
		private readonly clock: Clock = new SystemClock(),
		private readonly options: ConnectionControllerOptions = {},
	) {
		this.#logger = (options.logger ?? silentLogger).child({
			module: 'connection',
		})
	}

	get current(): Connection | undefined {
		return this.#connection
	}

	get configuration(): ConnectionConfiguration {
		return this.#configuration
	}

	subscribe(listener: ConnectionListener): () => void {
		this.#listeners.add(listener)
		listener(this.#connection)

		return () => {
			this.#listeners.delete(listener)
		}
	}

	subscribeConfiguration(listener: ConnectionConfigurationListener): () => void {
		this.#configurationListeners.add(listener)
		listener(this.#configuration)

		return () => {
			this.#configurationListeners.delete(listener)
		}
	}

	connect(input: EngineStartInput): Promise<Connection> {
		this.setConfiguration({ desired: input, phase: 'queued' })
		return this.enqueue(() => this.connectNow(input)).catch((error) => {
			this.reportQueuedOperationFailure(input, error)
			throw error
		})
	}

	reconfigure(input: EngineStartInput): Promise<Connection> {
		this.setConfiguration({
			desired: input,
			effective: this.#configuration.effective,
			phase: 'queued',
		})
		return this.enqueue(() => this.reconfigureNow(input))
	}

	disconnect(): Promise<Connection | undefined> {
		this.setConfiguration({
			desired: undefined,
			effective: this.#configuration.effective,
			phase: 'queued',
		})
		return this.enqueue(() => this.disconnectNow()).catch((error) => {
			if (!this.#configuration.desired) {
				this.setConfiguration({
					desired: undefined,
					effective: this.#configuration.effective,
					phase: 'error',
					error: errorMessage(error),
				})
			}
			throw error
		})
	}

	private async connectNow(input: EngineStartInput): Promise<Connection> {
		if (
			this.#connection?.state === 'connecting' ||
			this.#connection?.state === 'connected'
		) {
			throw new ConnectionError(
				'connection_invalid_state',
				'Connection is already active',
			)
		}

		this.setConnection(this.snapshot(input.profile, 'connecting'))
		this.#logger.info(
			{
				profileId: input.profile.id,
				localPort: input.localPort,
			},
			'Connecting',
		)

		const maxAttempts = Math.max(this.options.reconnect?.maxAttempts ?? 1, 1)
		const delayMs = this.options.reconnect?.delayMs ?? 0
		const wait = this.options.wait ?? defaultWait
		let lastError: unknown

		for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
			try {
				await this.engine.start(input)
				this.setConnection(this.snapshot(input.profile, 'connected'))
				this.setConfigurationAfterOperation(input, 'idle')
				this.#logger.info(
					{
						profileId: input.profile.id,
						attempt,
					},
					'Connected',
				)

				return this.#connection as Connection
			} catch (error) {
				lastError = error
				this.#logger.warn(
					{
						err: errorMessage(error),
						attempt,
						profileId: input.profile.id,
					},
					'Connect attempt failed',
				)

				if (attempt >= maxAttempts) {
					this.setConnection(
						this.snapshot(input.profile, 'error', errorMessage(error)),
					)
					this.#logger.error(
						{
							err: errorMessage(error),
							profileId: input.profile.id,
						},
						'Connect failed',
					)
					throw error
				}

				await wait(delayMs)
			}
		}

		throw lastError
	}

	private async disconnectNow(): Promise<Connection | undefined> {
		const active = this.#connection

		if (!active || active.state === 'disconnected') {
			const health = await this.engine.status()
			if (health.status !== 'stopped') await this.engine.stop()
			this.setConfigurationAfterOperation(undefined, 'idle')
			return active
		}

		if (active.state === 'disconnecting') {
			throw new ConnectionError(
				'connection_invalid_state',
				'Connection is already disconnecting',
			)
		}

		this.setConnection(this.snapshot(active.profile, 'disconnecting'))
		this.#logger.info({ profileId: active.profile.id }, 'Disconnecting')

		try {
			await this.engine.stop()
			this.setConnection(this.snapshot(active.profile, 'disconnected'))
			this.setConfigurationAfterOperation(undefined, 'idle')
			this.#logger.info({ profileId: active.profile.id }, 'Disconnected')

			return this.#connection
		} catch (error) {
			this.setConnection(
				this.snapshot(active.profile, 'error', errorMessage(error)),
			)
			this.#logger.error(
				{
					err: errorMessage(error),
					profileId: active.profile.id,
				},
				'Disconnect failed',
			)
			throw error
		}
	}

	private async reconfigureNow(input: EngineStartInput): Promise<Connection> {
		const previous = this.#configuration.effective
		const active = this.#connection

		if (!previous) {
			return this.replaceRecoveredSession(input)
		}

		if (active?.state !== 'connected') {
			return this.replaceRecoveredSession(input)
		}

		if (sameEngineStartInput(previous, input)) {
			this.setConfigurationAfterOperation(previous, 'idle')
			return active
		}

		this.setReconfigurationPhase('preparing')

		try {
			this.setReconfigurationPhase('stopping-old-connection')
			await this.disconnectNow()
			this.setReconfigurationPhase('restoring-device-settings')
			this.setReconfigurationPhase('initializing-engine')
			this.setReconfigurationPhase(
				input.mode === 'proxy' ? 'applying-system-proxy' : 'applying-vpn',
			)
			const connection = await this.connectNow(input)
			this.setReconfigurationPhase('verifying')
			const health = await this.engine.status()
			if (health.status !== 'running') {
				throw new ConnectionError(
					'connection_invalid_state',
					`Reconfigured engine did not become ready (${health.status})`,
				)
			}
			this.setConfigurationAfterOperation(input, 'idle')
			return connection
		} catch (error) {
			return this.rollbackReconfiguration(previous, error)
		}
	}

	private async replaceRecoveredSession(
		input: EngineStartInput,
	): Promise<Connection> {
		this.setReconfigurationPhase('preparing')

		try {
			const health = await this.engine.status()
			if (health.status !== 'stopped') {
				this.setReconfigurationPhase('stopping-old-connection')
				await this.engine.stop()
				this.setReconfigurationPhase('restoring-device-settings')
			}
			this.setReconfigurationPhase('initializing-engine')
			this.setReconfigurationPhase(
				input.mode === 'proxy' ? 'applying-system-proxy' : 'applying-vpn',
			)
			const connection = await this.connectNow(input)
			this.setReconfigurationPhase('verifying')
			const started = await this.engine.status()
			if (started.status !== 'running') {
				throw new ConnectionError(
					'connection_invalid_state',
					`Reconfigured engine did not become ready (${started.status})`,
				)
			}
			this.setConfigurationAfterOperation(input, 'idle')
			return connection
		} catch (error) {
			const cleanupError = await this.cleanupEngine()
			const message = cleanupError
				? `Unable to replace recovered connection: ${errorMessage(error)}; cleanup failed: ${cleanupError}`
				: `Unable to replace recovered connection: ${errorMessage(error)}`
			this.setConnection(this.snapshot(input.profile, 'error', message))
			this.setConfiguration({
				desired: this.#configuration.desired,
				effective: undefined,
				phase: 'error',
				error: message,
			})
			throw error
		}
	}

	private async rollbackReconfiguration(
		previous: EngineStartInput,
		cause: unknown,
	): Promise<never> {
		const desired = this.#configuration.desired
		this.setReconfigurationPhase('rolling-back')

		try {
			const cleanupError = await this.cleanupEngine()
			if (cleanupError) throw new Error(cleanupError)
			await this.connectNow(previous)
			this.setConfiguration({
				desired,
				effective: previous,
				phase: 'rollback-succeeded',
				error: `Reconfiguration failed; previous connection restored: ${errorMessage(cause)}`,
			})
		} catch (rollbackError) {
			const cleanupError = await this.cleanupEngine()
			const cleanupDetail = cleanupError
				? `; final cleanup failed: ${cleanupError}`
				: ''
			const message = `Reconfiguration failed: ${errorMessage(cause)}; rollback failed: ${errorMessage(rollbackError)}${cleanupDetail}`
			this.setConnection(this.snapshot(previous.profile, 'error', message))
			this.setConfiguration({
				desired,
				effective: undefined,
				phase: 'error',
				error: message,
			})
			throw new ConnectionError('connection_invalid_state', message)
		}

		throw cause
	}

	async test(
		profile: ConnectionProfile = requiredProfile(this.#connection),
	): Promise<LatencyResult> {
		return this.engine.test(profile)
	}

	private setConnection(connection: Connection | undefined) {
		this.#connection = connection
		this.notify()
	}

	private notify() {
		for (const listener of this.#listeners) {
			listener(this.#connection)
		}
	}

	private setConfiguration(configuration: ConnectionConfiguration) {
		this.#configuration = configuration
		for (const listener of this.#configurationListeners) {
			listener(configuration)
		}
	}

	private setReconfigurationPhase(phase: ConnectionReconfigurationPhase) {
		this.setConfiguration({ ...this.#configuration, phase })
	}

	private setConfigurationAfterOperation(
		effective: EngineStartInput | undefined,
		phase: ConnectionReconfigurationPhase,
	) {
		this.setConfiguration({
			desired: this.#configuration.desired,
			effective,
			phase:
				this.#configuration.desired === effective ||
				sameOptionalEngineStartInput(this.#configuration.desired, effective)
					? phase
					: 'queued',
		})
	}

	private reportQueuedOperationFailure(input: EngineStartInput, error: unknown) {
		if (!sameOptionalEngineStartInput(this.#configuration.desired, input)) return
		this.setConfiguration({
			desired: input,
			effective: this.#configuration.effective,
			phase: 'error',
			error: errorMessage(error),
		})
	}

	private async cleanupEngine(): Promise<string | undefined> {
		try {
			const health = await this.engine.status()
			if (health.status !== 'stopped') await this.engine.stop()
			const stopped = await this.engine.status()
			return stopped.status === 'stopped'
				? undefined
				: `Engine remained ${stopped.status} after cleanup`
		} catch (error) {
			return errorMessage(error)
		}
	}

	private enqueue<T>(operation: () => Promise<T>): Promise<T> {
		const result = this.#operationTail.then(operation, operation)
		this.#operationTail = result.then(
			() => undefined,
			() => undefined,
		)
		return result
	}

	private snapshot(
		profile: ConnectionProfile,
		state: ConnectionState,
		error?: string,
	): Connection {
		return {
			profile,
			state,
			changedAt: this.clock.now(),
			error,
		}
	}
}

function sameOptionalEngineStartInput(
	left: EngineStartInput | undefined,
	right: EngineStartInput | undefined,
) {
	if (!left || !right) return left === right
	return sameEngineStartInput(left, right)
}

function sameEngineStartInput(left: EngineStartInput, right: EngineStartInput) {
	return (
		JSON.stringify(comparableInput(left)) ===
		JSON.stringify(comparableInput(right))
	)
}

function comparableInput(input: EngineStartInput) {
	return {
		profile: input.profile,
		engineId: input.engineId,
		mode: input.mode,
		localPort: input.localPort,
		options: input.options,
	}
}

function defaultWait(ms: number) {
	return new Promise<void>((resolve) => {
		setTimeout(resolve, ms)
	})
}

function requiredProfile(connection: Connection | undefined) {
	if (!connection) {
		throw new ConnectionError(
			'connection_invalid_state',
			'No active profile is available',
		)
	}

	return connection.profile
}

function errorMessage(error: unknown) {
	return error instanceof Error ? error.message : 'Unknown connection error'
}
