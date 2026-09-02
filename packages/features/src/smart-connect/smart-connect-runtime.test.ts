import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import {
	JsonProfileStore,
	JsonSettingsStore,
	MemoryDocumentStore,
} from '@rahrow/core/storage/json-store.ts'
import { describe, expect, it, vi } from 'vitest'

import type { ConnectionPort } from '../app/runtime.tsx'
import { createSmartConnectRuntime } from './smart-connect-runtime.ts'

const profile: ConnectionProfile = {
	id: 'fast',
	protocol: 'trojan',
	endpoint: { host: 'fast.example', port: 443 },
	authentication: { password: 'secret' },
}

describe('createSmartConnectRuntime', () => {
	it('publishes a completed scheduled decision after durable state is current', async () => {
		const profileStore = new JsonProfileStore(new MemoryDocumentStore())
		await profileStore.save(profile)
		const settingsStore = new JsonSettingsStore(new MemoryDocumentStore())
		await settingsStore.write({
			connectionMode: 'vpn',
			smartConnect: {
				enabled: true,
				nextRunAt: '2026-09-01T23:59:00.000Z',
			},
		})
		const connection: ConnectionPort = {
			connect: vi.fn(),
			disconnect: vi.fn(),
			status: vi.fn().mockResolvedValue({ state: 'disconnected', mode: 'vpn' }),
			test: vi.fn().mockResolvedValue({ reachable: true, latencyMs: 12 }),
		}
		const runtime = createSmartConnectRuntime({
			profileStore,
			settingsStore,
			connection,
			now: () => '2026-09-02T00:00:00.000Z',
		})
		const listener = vi.fn()
		const unsubscribe = runtime.subscribe(listener)

		await runtime.schedule.start()

		expect(listener).toHaveBeenCalledOnce()
		expect(listener).toHaveBeenCalledWith(
			expect.objectContaining({ outcome: 'connected' }),
		)
		await expect(settingsStore.read()).resolves.toMatchObject({
			activeProfileId: profile.id,
		})

		unsubscribe()
		await runtime.orchestrator.run()
		expect(listener).toHaveBeenCalledOnce()
		runtime.schedule.stop()
	})

	it('recovers the native active profile before an overdue background decision', async () => {
		const profileStore = new JsonProfileStore(new MemoryDocumentStore())
		await profileStore.save(profile)
		const settingsStore = new JsonSettingsStore(new MemoryDocumentStore())
		await settingsStore.write({
			connectionMode: 'vpn',
			smartConnect: {
				enabled: true,
				nextRunAt: '2026-09-01T23:59:00.000Z',
			},
		})
		const connect = vi.fn<ConnectionPort['connect']>()
		const connection: ConnectionPort = {
			connect,
			disconnect: vi.fn(),
			status: vi.fn().mockResolvedValue({
				state: 'connected',
				mode: 'vpn',
				engineId: 'sing-box',
				profileId: profile.id,
			}),
			test: vi.fn().mockResolvedValue({ reachable: true, latencyMs: 12 }),
		}
		const runtime = createSmartConnectRuntime({
			profileStore,
			settingsStore,
			connection,
			now: () => '2026-09-02T00:00:00.000Z',
		})

		await runtime.orchestrator.runIfDue()

		expect(connect).not.toHaveBeenCalled()
		await expect(settingsStore.read()).resolves.toMatchObject({
			smartConnect: {
				lastDecision: { profileId: profile.id, latencyMs: 12 },
			},
		})
	})

	it('forwards the selected engine and preflights it before connecting', async () => {
		const profileStore = new JsonProfileStore(new MemoryDocumentStore())
		await profileStore.save(profile)
		const settingsStore = new JsonSettingsStore(new MemoryDocumentStore())
		await settingsStore.write({
			connectionMode: 'proxy',
			engineId: 'xray',
			localPort: 12080,
		})
		const canConnect = vi.fn().mockRejectedValue(new Error('unsupported mode'))
		const connect = vi.fn<ConnectionPort['connect']>()
		const runtime = createSmartConnectRuntime({
			profileStore,
			settingsStore,
			connection: {
				canConnect,
				connect,
				disconnect: vi.fn(),
				status: vi.fn().mockResolvedValue({ state: 'disconnected' }),
				test: vi.fn().mockResolvedValue({ reachable: true, latencyMs: 12 }),
			},
		})

		await expect(runtime.orchestrator.run()).rejects.toThrow('unsupported mode')
		expect(canConnect).toHaveBeenCalledWith(profile, {
			mode: 'proxy',
			engineId: 'xray',
			localPort: 12080,
		})
		expect(connect).not.toHaveBeenCalled()
	})
})
