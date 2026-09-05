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

const replacementProfile: ConnectionProfile = {
	id: 'profile-2',
	protocol: 'trojan',
	endpoint: {
		host: 'replacement.example.com',
		port: 443,
	},
}

const latestProfile: ConnectionProfile = {
	id: 'profile-3',
	protocol: 'vmess',
	endpoint: {
		host: 'latest.example.com',
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
	events: string[] = []
	startError: Error | undefined
	failuresRemaining = 0
	failOnceForProfiles = new Set<string>()

	async start(input: EngineStartInput): Promise<void> {
		this.starts += 1
		this.events.push(`start:${input.profile.id}:${input.engineId ?? 'default'}`)
		if (this.failOnceForProfiles.delete(input.profile.id)) {
			throw new Error(`start failed for ${input.profile.id}`)
		}

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
		this.events.push('stop')
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
	it('atomically stops the effective session before starting a changed configuration', async () => {
		const engine = new TestEngine()
		const controller = new ConnectionController(engine)
		const initial = { profile, engineId: 'xray' as const, mode: 'vpn' as const }
		const replacement = {
			profile: replacementProfile,
			engineId: 'sing-box' as const,
			mode: 'proxy' as const,
		}

		await controller.connect(initial)
		await expect(controller.reconfigure(replacement)).resolves.toMatchObject({
			state: 'connected',
			profile: { id: 'profile-2' },
		})

		expect(engine.events).toEqual([
			'start:profile-1:xray',
			'stop',
			'start:profile-2:sing-box',
		])
		expect(controller.configuration).toMatchObject({
			phase: 'idle',
			desired: replacement,
			effective: replacement,
		})
	})

	it('restores the previous effective session when the replacement fails to start', async () => {
		const engine = new TestEngine()
		const controller = new ConnectionController(engine)
		const initial = { profile, engineId: 'xray' as const, mode: 'vpn' as const }
		const replacement = {
			profile: replacementProfile,
			engineId: 'sing-box' as const,
			mode: 'proxy' as const,
		}

		await controller.connect(initial)
		engine.failOnceForProfiles.add('profile-2')

		await expect(controller.reconfigure(replacement)).rejects.toThrow(
			'start failed for profile-2',
		)
		expect(controller.current).toMatchObject({
			state: 'connected',
			profile: { id: 'profile-1' },
		})
		expect(controller.configuration).toMatchObject({
			phase: 'rollback-succeeded',
			desired: replacement,
			effective: initial,
			error: expect.stringContaining('previous connection restored'),
		})
		expect(engine.events).toEqual([
			'start:profile-1:xray',
			'stop',
			'start:profile-2:sing-box',
			'stop',
			'start:profile-1:xray',
		])
	})

	it('serializes rapid reconfiguration requests and leaves the latest request effective', async () => {
		const engine = new TestEngine()
		const controller = new ConnectionController(engine)
		await controller.connect({ profile, engineId: 'xray', mode: 'vpn' })

		const first = controller.reconfigure({
			profile: replacementProfile,
			engineId: 'sing-box',
			mode: 'proxy',
		})
		const latest = {
			profile: latestProfile,
			engineId: 'xray' as const,
			mode: 'vpn' as const,
			localPort: 1090,
		}
		const second = controller.reconfigure(latest)

		await Promise.all([first, second])

		expect(engine.events).toEqual([
			'start:profile-1:xray',
			'stop',
			'start:profile-2:sing-box',
			'stop',
			'start:profile-3:xray',
		])
		expect(controller.configuration).toMatchObject({
			phase: 'idle',
			desired: latest,
			effective: latest,
		})
	})

	it('publishes truthful reconfiguration phases without invoking engine restart', async () => {
		const engine = new TestEngine()
		const controller = new ConnectionController(engine)
		await controller.connect({ profile, engineId: 'xray', mode: 'vpn' })
		const phases: string[] = []
		const unsubscribe = controller.subscribeConfiguration(({ phase }) => {
			phases.push(phase)
		})

		await controller.reconfigure({
			profile: replacementProfile,
			engineId: 'sing-box',
			mode: 'proxy',
		})
		unsubscribe()

		expect(phases).toEqual(
			expect.arrayContaining([
				'queued',
				'preparing',
				'stopping-old-connection',
				'restoring-device-settings',
				'initializing-engine',
				'applying-system-proxy',
				'verifying',
				'idle',
			]),
		)
	})

	it('cleans up an externally recovered engine before reconfiguring after app resume', async () => {
		const engine = new TestEngine()
		engine.starts = 1
		const controller = new ConnectionController(engine)

		await controller.reconfigure({
			profile: replacementProfile,
			engineId: 'sing-box',
			mode: 'proxy',
		})

		expect(engine.events).toEqual(['stop', 'start:profile-2:sing-box'])
		expect(controller.current).toMatchObject({
			state: 'connected',
			profile: { id: 'profile-2' },
		})
	})

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
