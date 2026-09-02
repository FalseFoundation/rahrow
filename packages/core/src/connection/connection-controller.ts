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
	readonly #listeners = new Set<ConnectionListener>()
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

	subscribe(listener: ConnectionListener): () => void {
		this.#listeners.add(listener)
		listener(this.#connection)

		return () => {
			this.#listeners.delete(listener)
		}
	}

	async connect(input: EngineStartInput): Promise<Connection> {
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

	async disconnect(): Promise<Connection | undefined> {
		const active = this.#connection

		if (!active || active.state === 'disconnected') {
			const health = await this.engine.status()
			if (health.status !== 'stopped') await this.engine.stop()
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
