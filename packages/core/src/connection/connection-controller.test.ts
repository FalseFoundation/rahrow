import { describe, expect, it } from 'vitest'

import { ConnectionError } from '../errors.ts'
import { createLogBuffer } from '../logging/log-buffer.ts'
import { createPinoLogger } from '../logging/pino-logger.ts'
import type { ConnectionProfile } from '../profile/connection-profile.ts'
import type {
	EngineHealth,
	EngineStartInput,
	LatencyResult,
	ProxyEngine,
} from '../runtime/proxy-engine.ts'
import { type Clock, ConnectionController } from './connection-controller.ts'

const profile: ConnectionProfile = {
	id: 'profile-1',
	protocol: 'vless',
	endpoint: {
		host: 'example.com',
		port: 443,
	},
}

class TestClock implements Clock {
	#index = 0

	now(): string {
		this.#index += 1

		return `2026-01-01T00:00:0${this.#index}.000Z`
	}
}

class TestEngine implements ProxyEngine {
	readonly manifest = {
		id: 'xray',
		supportedProtocols: ['vless', 'vmess', 'trojan'],
	} as const

	starts = 0
	stops = 0
	startError: Error | undefined
	failuresRemaining = 0

	async start(_input: EngineStartInput): Promise<void> {
		this.starts += 1

		if (this.failuresRemaining > 0) {
			this.failuresRemaining -= 1
			throw new Error('start failed')
		}

		if (this.startError) {
			throw this.startError
		}
	}

	async stop(): Promise<void> {
		this.stops += 1
	}

	async restart(input: EngineStartInput): Promise<void> {
		await this.stop()
		await this.start(input)
	}

	async status(): Promise<EngineHealth> {
		return {
			status: this.starts > this.stops ? 'running' : 'stopped',
			checkedAt: '2026-01-01T00:00:00.000Z',
		}
	}

	async test(candidate: ConnectionProfile): Promise<LatencyResult> {
		return {
			profileId: candidate.id,
			reachable: true,
			checkedAt: '2026-01-01T00:00:00.000Z',
			latencyMs: 42,
		}
	}
}

describe('ConnectionController', () => {
	it('connects and disconnects through a proxy engine', async () => {
		const engine = new TestEngine()
		const controller = new ConnectionController(engine, new TestClock())

		await expect(controller.connect({ profile })).resolves.toMatchObject({
			state: 'connected',
			changedAt: '2026-01-01T00:00:02.000Z',
		})
		expect(engine.starts).toBe(1)

		await expect(controller.disconnect()).resolves.toMatchObject({
			state: 'disconnected',
			changedAt: '2026-01-01T00:00:04.000Z',
		})
		expect(engine.stops).toBe(1)
	})

	it('stops a running proxy engine after the app runtime is reconstructed', async () => {
		const engine = new TestEngine()
		engine.starts = 1
		const reconstructedController = new ConnectionController(engine)

		await expect(reconstructedController.disconnect()).resolves.toBeUndefined()
		expect(engine.stops).toBe(1)
		await expect(engine.status()).resolves.toMatchObject({ status: 'stopped' })
	})

	it('rejects duplicate connect attempts while connected', async () => {
		const controller = new ConnectionController(new TestEngine())

		await controller.connect({ profile })
		await expect(controller.connect({ profile })).rejects.toThrow(ConnectionError)
	})

	it('records error state when engine start fails', async () => {
		const engine = new TestEngine()
		engine.startError = new Error('start failed')
		const controller = new ConnectionController(engine)

		await expect(controller.connect({ profile })).rejects.toThrow('start failed')
		expect(controller.current).toMatchObject({
			state: 'error',
			error: 'start failed',
		})
	})

	it('uses the active profile for latency tests', async () => {
		const controller = new ConnectionController(new TestEngine())

		await controller.connect({ profile })
		await expect(controller.test()).resolves.toMatchObject({
			profileId: 'profile-1',
			reachable: true,
			latencyMs: 42,
		})
	})

	it('notifies subscribers of connection state changes', async () => {
		const engine = new TestEngine()
		const controller = new ConnectionController(engine, new TestClock())
		const states: Array<string | undefined> = []
		const unsubscribe = controller.subscribe((connection) => {
			states.push(connection?.state)
		})

		await controller.connect({ profile })
		await controller.disconnect()
		unsubscribe()
		await controller.connect({ profile })

		expect(states).toEqual([
			undefined,
			'connecting',
			'connected',
			'disconnecting',
			'disconnected',
		])
	})

	it('retries engine start according to reconnect policy without duplicating process logic', async () => {
		const engine = new TestEngine()
		engine.failuresRemaining = 2
		const waits: number[] = []
		const controller = new ConnectionController(engine, new TestClock(), {
			reconnect: {
				maxAttempts: 3,
				delayMs: 25,
			},
			async wait(ms) {
				waits.push(ms)
			},
		})

		await expect(controller.connect({ profile })).resolves.toMatchObject({
			state: 'connected',
		})
		expect(engine.starts).toBe(3)
		expect(engine.stops).toBe(0)
		expect(waits).toEqual([25, 25])
		expect(controller.current?.state).toBe('connected')
	})

	it('exhausts reconnect attempts and then records error state', async () => {
		const engine = new TestEngine()
		engine.startError = new Error('start failed')
		const controller = new ConnectionController(engine, new TestClock(), {
			reconnect: {
				maxAttempts: 2,
				delayMs: 0,
			},
			async wait() {},
		})

		await expect(controller.connect({ profile })).rejects.toThrow('start failed')
		expect(engine.starts).toBe(2)
		expect(controller.current).toMatchObject({
			state: 'error',
			error: 'start failed',
		})
	})

	it('records connect lifecycle events through the injected logger', async () => {
		const logs = createLogBuffer()
		const controller = new ConnectionController(
			new TestEngine(),
			new TestClock(),
			{
				logger: createPinoLogger({
					destination: logs,
					level: 'debug',
				}),
			},
		)

		await controller.connect({ profile })

		expect(logs.records().map((record) => record.msg)).toEqual(
			expect.arrayContaining(['Connecting', 'Connected']),
		)
		expect(logs.records().some((record) => record.module === 'connection')).toBe(
			true,
		)
	})
})
