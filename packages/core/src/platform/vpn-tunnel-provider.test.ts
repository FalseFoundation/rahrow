import { describe, expect, it } from 'vitest'

import type { ConnectionProfile } from '../profile/connection-profile.ts'
import {
	VpnTunnelCoordinator,
	type VpnTunnelProvider,
	type VpnTunnelStartInput,
	type VpnTunnelStatus,
} from './vpn-tunnel-provider.ts'

const profile: ConnectionProfile = {
	id: 'profile-1',
	protocol: 'shadowsocks',
	endpoint: { host: 'example.com', port: 8388 },
	authentication: { method: 'aes-256-gcm', password: 'top-secret' },
}

class TestProvider implements VpnTunnelProvider {
	statusValue: VpnTunnelStatus = { state: 'disconnected' }
	starts: VpnTunnelStartInput[] = []
	stops = 0
	startError: Error | undefined
	readonly availabilityValue = { available: true as const }

	async availability() {
		return this.availabilityValue
	}

	async start(input: VpnTunnelStartInput) {
		this.starts.push(input)
		if (this.startError) throw this.startError
		this.statusValue = {
			state: 'connected',
			profileId: input.profile.id,
			engineId: input.engineId,
		}
	}

	async stop() {
		this.stops += 1
		this.statusValue = { state: 'disconnected' }
	}

	async status() {
		return this.statusValue
	}
}

describe('VpnTunnelCoordinator', () => {
	it('gives one platform provider exclusive ownership until disconnect', async () => {
		const provider = new TestProvider()
		const coordinator = new VpnTunnelCoordinator(provider)

		await coordinator.connect({ profile, engineId: 'xray' })
		await expect(
			coordinator.connect({
				profile: { ...profile, id: 'profile-2' },
				engineId: 'sing-box',
			}),
		).rejects.toMatchObject({ code: 'connection_invalid_state' })

		await coordinator.disconnect()
		await coordinator.connect({
			profile: { ...profile, id: 'profile-2' },
			engineId: 'sing-box',
		})
		expect(provider.starts.map((input) => input.engineId)).toEqual([
			'xray',
			'sing-box',
		])
	})

	it('fails closed with structured availability diagnostics', async () => {
		const provider: VpnTunnelProvider = {
			async availability() {
				return {
					available: false,
					reason: 'missing-entitlement',
					detail: 'Network Extension entitlement is missing',
				}
			},
			async start() {},
			async stop() {},
			async status() {
				return { state: 'unavailable' }
			},
		}
		const coordinator = new VpnTunnelCoordinator(provider)

		await expect(
			coordinator.connect({ profile, engineId: 'xray' }),
		).rejects.toMatchObject({
			code: 'unsupported_capability',
			message: 'Network Extension entitlement is missing',
		})
	})

	it('rolls back failed starts and redacts profile secrets', async () => {
		const provider = new TestProvider()
		provider.startError = new Error('native rejected top-secret')
		const coordinator = new VpnTunnelCoordinator(provider)

		await expect(
			coordinator.connect({ profile, engineId: 'xray' }),
		).rejects.toMatchObject({
			message: 'native rejected [redacted]',
		})
		expect(provider.stops).toBe(1)
		await expect(coordinator.status()).resolves.toEqual({ state: 'disconnected' })
	})

	it('cleans up stale provider state during crash recovery', async () => {
		const provider = new TestProvider()
		provider.statusValue = {
			state: 'connected',
			profileId: 'stale-profile',
			engineId: 'xray',
		}
		const coordinator = new VpnTunnelCoordinator(provider)

		await coordinator.recover()
		expect(provider.stops).toBe(1)
		await expect(coordinator.status()).resolves.toEqual({ state: 'disconnected' })
	})

	it('disconnects an active native tunnel after the app runtime is reconstructed', async () => {
		const provider = new TestProvider()
		provider.statusValue = {
			state: 'connected',
			profileId: 'profile-before-restart',
			engineId: 'sing-box',
		}
		const reconstructedCoordinator = new VpnTunnelCoordinator(provider)

		await expect(reconstructedCoordinator.disconnect()).resolves.toEqual({
			state: 'disconnected',
		})
		expect(provider.stops).toBe(1)
	})
})
