import { describe, expect, it, vi } from 'vitest'

import type { ConnectionProfile } from '../profile/connection-profile.ts'
import {
	JsonProfileStore,
	JsonSettingsStore,
	MemoryDocumentStore,
} from '../storage/json-store.ts'
import {
	SMART_CONNECT_INTERVAL_MS,
	type SmartConnectConnection,
	SmartConnectOrchestrator,
} from './smart-connect.ts'

function profile(id: string): ConnectionProfile {
	return {
		id,
		protocol: 'trojan',
		endpoint: { host: `${id}.example.com`, port: 443 },
		authentication: { password: 'secret' },
	}
}

async function stores(profiles: readonly ConnectionProfile[]) {
	const profileStore = new JsonProfileStore(new MemoryDocumentStore())
	await profileStore.replaceAll(profiles)
	return {
		profileStore,
		settingsStore: new JsonSettingsStore(new MemoryDocumentStore()),
	}
}

class TestConnection implements SmartConnectConnection {
	current: SmartConnectConnection['current']
	readonly connected: string[] = []
	readonly inputs: Parameters<SmartConnectConnection['connect']>[0][] = []
	disconnects = 0
	readonly failedProfileIds = new Set<string>()
	validateError: Error | undefined
	connectGate: Promise<void> | undefined

	async validate() {
		if (this.validateError) throw this.validateError
	}

	async connect(input: Parameters<SmartConnectConnection['connect']>[0]) {
		this.connected.push(input.profile.id)
		this.inputs.push(input)
		await this.connectGate
		if (this.failedProfileIds.has(input.profile.id)) {
			throw new Error(`cannot connect ${input.profile.id}`)
		}
		this.current = { profile: input.profile, state: 'connected' }
	}

	async disconnect() {
		this.disconnects += 1
		this.current = this.current
			? { ...this.current, state: 'disconnected' }
			: undefined
	}
}

describe('SmartConnectOrchestrator', () => {
	it('bounds probes and deterministically connects the fastest reachable profile', async () => {
		const candidates = ['slow', 'fast-b', 'fast-a', 'offline'].map(profile)
		const { profileStore, settingsStore } = await stores(candidates)
		const connection = new TestConnection()
		let active = 0
		let maxActive = 0
		const latency = new Map([
			['slow', 80],
			['fast-b', 20],
			['fast-a', 20],
		])
		const orchestrator = new SmartConnectOrchestrator({
			profileStore,
			settingsStore,
			connection,
			concurrency: 2,
			probe: async (candidate) => {
				active += 1
				maxActive = Math.max(maxActive, active)
				await Promise.resolve()
				active -= 1
				const latencyMs = latency.get(candidate.id)
				return {
					profileId: candidate.id,
					reachable: latencyMs !== undefined,
					checkedAt: '2026-09-02T00:00:00.000Z',
					latencyMs,
				}
			},
			now: () => '2026-09-02T00:00:00.000Z',
		})

		await expect(orchestrator.run()).resolves.toMatchObject({
			outcome: 'connected',
			winner: { profileId: 'fast-a', latencyMs: 20 },
			probed: 4,
		})
		expect(maxActive).toBe(2)
		expect(connection.connected).toEqual(['fast-a'])
	})

	it('reports domain-neutral progress while testing and safely switching', async () => {
		const candidates = ['slow', 'fast'].map(profile)
		const { profileStore, settingsStore } = await stores(candidates)
		const connection = new TestConnection()
		connection.current = {
			profile: profile('current'),
			state: 'connected',
		}
		const onProgress = vi.fn()
		const orchestrator = new SmartConnectOrchestrator({
			profileStore,
			settingsStore,
			connection,
			concurrency: 1,
			probe: async (candidate) => ({
				profileId: candidate.id,
				reachable: true,
				checkedAt: '2026-09-02T00:00:00.000Z',
				latencyMs: candidate.id === 'fast' ? 10 : 40,
			}),
		})

		await orchestrator.run({ onProgress })

		expect(onProgress.mock.calls.map(([progress]) => progress)).toEqual([
			{ phase: 'queued', total: 2 },
			{ phase: 'testing', active: 1, completed: 0, started: 1, total: 2 },
			{ phase: 'testing', active: 0, completed: 1, started: 1, total: 2 },
			{ phase: 'testing', active: 1, completed: 1, started: 2, total: 2 },
			{ phase: 'testing', active: 0, completed: 2, started: 2, total: 2 },
			{ phase: 'selecting', total: 2 },
			{ phase: 'switching', total: 2, winnerLatencyMs: 10 },
		])
	})

	it('keeps a healthy winning connection and cancels queued work', async () => {
		const candidates = ['active', 'other', 'last'].map(profile)
		const { profileStore, settingsStore } = await stores(candidates)
		const connection = new TestConnection()
		connection.current = {
			profile: candidates[0] as ConnectionProfile,
			state: 'connected',
		}
		const controller = new AbortController()
		let probes = 0
		const orchestrator = new SmartConnectOrchestrator({
			profileStore,
			settingsStore,
			connection,
			concurrency: 1,
			probe: async (candidate) => {
				probes += 1
				if (candidate.id === 'active') controller.abort()
				return {
					profileId: candidate.id,
					reachable: true,
					checkedAt: '2026-09-02T00:00:00.000Z',
					latencyMs: candidate.id === 'active' ? 10 : 20,
				}
			},
		})

		await expect(
			orchestrator.run({ signal: controller.signal }),
		).rejects.toMatchObject({
			name: 'AbortError',
		})
		expect(probes).toBe(1)
		expect(connection.disconnects).toBe(0)
		expect(connection.connected).toEqual([])
	})

	it('persists a five-minute schedule and only runs due enabled work', async () => {
		const { profileStore, settingsStore } = await stores([profile('only')])
		const connection = new TestConnection()
		let now = '2026-09-02T00:00:00.000Z'
		let probes = 0
		const orchestrator = new SmartConnectOrchestrator({
			profileStore,
			settingsStore,
			connection,
			probe: async (candidate) => {
				probes += 1
				return {
					profileId: candidate.id,
					reachable: true,
					checkedAt: now,
					latencyMs: 12,
				}
			},
			now: () => now,
		})

		await orchestrator.start()
		await expect(orchestrator.runIfDue()).resolves.toMatchObject({
			outcome: 'connected',
		})
		expect((await orchestrator.status()).nextRunAt).toBe(
			new Date(Date.parse(now) + SMART_CONNECT_INTERVAL_MS).toISOString(),
		)
		await expect(orchestrator.runIfDue()).resolves.toMatchObject({
			outcome: 'not-due',
		})
		expect(probes).toBe(1)

		now = '2026-09-02T00:05:00.000Z'
		await expect(orchestrator.runIfDue()).resolves.toMatchObject({
			outcome: 'unchanged',
		})
		expect(probes).toBe(2)
		await orchestrator.stop()
		await expect(orchestrator.runIfDue()).resolves.toMatchObject({
			outcome: 'disabled',
		})
	})

	it('retains the current connection when no candidate succeeds', async () => {
		const current = profile('current')
		const { profileStore, settingsStore } = await stores([
			current,
			profile('other'),
		])
		const connection = new TestConnection()
		connection.current = { profile: current, state: 'connected' }
		const orchestrator = new SmartConnectOrchestrator({
			profileStore,
			settingsStore,
			connection,
			probe: async (candidate) => ({
				profileId: candidate.id,
				reachable: false,
				checkedAt: '2026-09-02T00:00:00.000Z',
			}),
		})

		await expect(orchestrator.run()).resolves.toMatchObject({
			outcome: 'no-reachable-profile',
		})
		expect(connection.disconnects).toBe(0)
	})

	it('restores the previous healthy connection when switching fails', async () => {
		const current = profile('current')
		const fastest = profile('fastest')
		const { profileStore, settingsStore } = await stores([current, fastest])
		const connection = new TestConnection()
		connection.current = { profile: current, state: 'connected' }
		connection.failedProfileIds.add(fastest.id)
		const orchestrator = new SmartConnectOrchestrator({
			profileStore,
			settingsStore,
			connection,
			probe: async (candidate) => ({
				profileId: candidate.id,
				reachable: true,
				checkedAt: '2026-09-02T00:00:00.000Z',
				latencyMs: candidate.id === fastest.id ? 10 : 20,
			}),
		})

		await expect(orchestrator.run()).rejects.toThrow('cannot connect fastest')
		expect(connection.connected).toEqual(['fastest', 'current'])
		expect(connection.current?.profile.id).toBe('current')
	})

	it('shares one switch across concurrent manual and scheduled runs', async () => {
		const fastest = profile('fastest')
		const { profileStore, settingsStore } = await stores([fastest])
		await settingsStore.write({
			engineId: 'sing-box',
			connectionMode: 'vpn',
			smartConnect: { enabled: true },
		})
		const connection = new TestConnection()
		let releaseConnect: (() => void) | undefined
		connection.connectGate = new Promise((resolve) => {
			releaseConnect = resolve
		})
		const orchestrator = new SmartConnectOrchestrator({
			profileStore,
			settingsStore,
			connection,
			probe: async (candidate) => ({
				profileId: candidate.id,
				reachable: true,
				checkedAt: '2026-09-02T00:00:00.000Z',
				latencyMs: 10,
			}),
		})

		const manual = orchestrator.run()
		const scheduled = orchestrator.runIfDue()
		await vi.waitFor(() => expect(connection.connected).toEqual(['fastest']))
		releaseConnect?.()

		await expect(Promise.all([manual, scheduled])).resolves.toHaveLength(2)
		expect(connection.connected).toEqual(['fastest'])
		expect(connection.disconnects).toBe(0)
	})

	it('isolates concurrent progress subscribers on the shared run', async () => {
		const fastest = profile('fastest')
		const { profileStore, settingsStore } = await stores([fastest])
		const connection = new TestConnection()
		let releaseProbe: (() => void) | undefined
		const orchestrator = new SmartConnectOrchestrator({
			profileStore,
			settingsStore,
			connection,
			probe: async (candidate) => {
				await new Promise<void>((resolve) => {
					releaseProbe = resolve
				})
				return {
					profileId: candidate.id,
					reachable: true,
					checkedAt: '2026-09-02T00:00:00.000Z',
					latencyMs: 10,
				}
			},
		})
		const healthyListener = vi.fn()
		const first = orchestrator.run({ onProgress: () => undefined })
		await vi.waitFor(() => expect(releaseProbe).toBeDefined())
		const second = orchestrator.run({
			onProgress(progress) {
				healthyListener(progress)
				throw new Error('surface closed')
			},
		})
		releaseProbe?.()

		await expect(Promise.all([first, second])).resolves.toHaveLength(2)
		expect(healthyListener).toHaveBeenCalledWith({
			phase: 'switching',
			total: 1,
			winnerLatencyMs: 10,
		})
		expect(connection.connected).toEqual(['fastest'])
	})

	it('cancels an active shared run when disabled before it can switch', async () => {
		const fastest = profile('fastest')
		const { profileStore, settingsStore } = await stores([fastest])
		await settingsStore.write({ smartConnect: { enabled: true } })
		const connection = new TestConnection()
		let releaseProbe: (() => void) | undefined
		const orchestrator = new SmartConnectOrchestrator({
			profileStore,
			settingsStore,
			connection,
			probe: async (candidate) => {
				await new Promise<void>((resolve) => {
					releaseProbe = resolve
				})
				return {
					profileId: candidate.id,
					reachable: true,
					checkedAt: '2026-09-02T00:00:00.000Z',
					latencyMs: 10,
				}
			},
		})

		const active = orchestrator.runIfDue()
		await vi.waitFor(() => expect(releaseProbe).toBeDefined())
		await orchestrator.stop()
		releaseProbe?.()

		await expect(active).rejects.toMatchObject({ name: 'AbortError' })
		expect(connection.connected).toEqual([])
		expect(connection.disconnects).toBe(0)
		expect((await orchestrator.status()).enabled).toBe(false)
	})

	it('rolls back a switch that finishes after Smart Connect is disabled', async () => {
		const current = profile('current')
		const fastest = profile('fastest')
		const { profileStore, settingsStore } = await stores([current, fastest])
		await settingsStore.write({ smartConnect: { enabled: true } })
		const connection = new TestConnection()
		connection.current = {
			profile: current,
			state: 'connected',
			runtime: { mode: 'vpn', engineId: 'sing-box', localPort: 10808 },
		}
		let releaseConnect: (() => void) | undefined
		connection.connectGate = new Promise((resolve) => {
			releaseConnect = resolve
		})
		const orchestrator = new SmartConnectOrchestrator({
			profileStore,
			settingsStore,
			connection,
			probe: async (candidate) => ({
				profileId: candidate.id,
				reachable: true,
				checkedAt: '2026-09-02T00:00:00.000Z',
				latencyMs: candidate.id === fastest.id ? 10 : 20,
			}),
		})

		const active = orchestrator.runIfDue()
		await vi.waitFor(() => expect(connection.connected).toEqual(['fastest']))
		const stopped = orchestrator.stop()
		releaseConnect?.()
		await stopped

		await expect(active).rejects.toMatchObject({ name: 'AbortError' })
		expect(connection.connected).toEqual(['fastest', 'current'])
		expect(connection.inputs[1]).toMatchObject({
			profile: { id: 'current' },
			mode: 'vpn',
			engineId: 'sing-box',
			localPort: 10808,
		})
		expect((await orchestrator.status()).enabled).toBe(false)
	})

	it('reinitializes the same profile when its runtime configuration changed', async () => {
		const fastest = profile('fastest')
		const { profileStore, settingsStore } = await stores([fastest])
		await settingsStore.write({
			engineId: 'xray',
			connectionMode: 'proxy',
			localPort: 12080,
		})
		const connection = new TestConnection()
		connection.current = {
			profile: fastest,
			state: 'connected',
			runtime: {
				engineId: 'sing-box',
				mode: 'vpn',
				localPort: 10808,
			},
		}
		const orchestrator = new SmartConnectOrchestrator({
			profileStore,
			settingsStore,
			connection,
			probe: async (candidate) => ({
				profileId: candidate.id,
				reachable: true,
				checkedAt: '2026-09-02T00:00:00.000Z',
				latencyMs: 10,
			}),
		})

		await expect(orchestrator.run()).resolves.toMatchObject({
			outcome: 'connected',
		})
		expect(connection.disconnects).toBe(1)
		expect(connection.inputs[0]).toMatchObject({
			profile: { id: 'fastest' },
			engineId: 'xray',
			mode: 'proxy',
			localPort: 12080,
		})
	})

	it('restores the exact previous runtime configuration after a failed switch', async () => {
		const current = profile('current')
		const fastest = profile('fastest')
		const { profileStore, settingsStore } = await stores([current, fastest])
		await settingsStore.write({
			engineId: 'xray',
			connectionMode: 'proxy',
			localPort: 12080,
		})
		const connection = new TestConnection()
		connection.current = {
			profile: current,
			state: 'connected',
			runtime: {
				engineId: 'sing-box',
				mode: 'vpn',
				localPort: 10808,
			},
		}
		connection.failedProfileIds.add(fastest.id)
		const orchestrator = new SmartConnectOrchestrator({
			profileStore,
			settingsStore,
			connection,
			probe: async (candidate) => ({
				profileId: candidate.id,
				reachable: true,
				checkedAt: '2026-09-02T00:00:00.000Z',
				latencyMs: candidate.id === fastest.id ? 10 : 20,
			}),
		})

		await expect(orchestrator.run()).rejects.toThrow('cannot connect fastest')
		expect(connection.inputs[1]).toMatchObject({
			profile: { id: 'current' },
			engineId: 'sing-box',
			mode: 'vpn',
			localPort: 10808,
		})
	})

	it('preflights an unsupported winner before disconnecting the active connection', async () => {
		const current = profile('current')
		const fastest = profile('fastest')
		const { profileStore, settingsStore } = await stores([current, fastest])
		await settingsStore.write({ connectionMode: 'proxy' })
		const connection = new TestConnection()
		connection.current = { profile: current, state: 'connected' }
		connection.validateError = new Error('proxy mode is unsupported')
		const orchestrator = new SmartConnectOrchestrator({
			profileStore,
			settingsStore,
			connection,
			probe: async (candidate) => ({
				profileId: candidate.id,
				reachable: true,
				checkedAt: '2026-09-02T00:00:00.000Z',
				latencyMs: candidate.id === fastest.id ? 10 : 20,
			}),
		})

		await expect(orchestrator.run()).rejects.toThrow('proxy mode is unsupported')
		expect(connection.disconnects).toBe(0)
		expect(connection.connected).toEqual([])
	})
})
