import { describe, expect, it } from 'vitest'

import {
	CapacitorMobileVpn,
	createMobileVpn,
	type MobileVpnDiagnostics,
	type MobileVpnStatus,
	type RahRowVpnPlugin,
	UnsupportedRahRowVpnPlugin,
} from './mobile-vpn.ts'

class FakeRahRowVpnPlugin implements RahRowVpnPlugin {
	connectedProfileId: string | undefined
	receivedConfig: unknown
	receivedSocksPort: number | undefined
	lastProbe: { readonly host: string; readonly port: number } | undefined

	async networkIdentity() {
		return { localAddresses: ['192.168.1.9'] }
	}

	async connect(input: {
		readonly profileId: string
		readonly engineConfig?: unknown
		readonly socksPort?: number
	}): Promise<void> {
		this.connectedProfileId = input.profileId
		this.receivedConfig = input.engineConfig
		this.receivedSocksPort = input.socksPort
	}

	async disconnect(): Promise<void> {
		this.connectedProfileId = undefined
	}

	async status(): Promise<MobileVpnStatus> {
		return {
			connected: this.connectedProfileId !== undefined,
			state: this.connectedProfileId ? 'connected' : 'disconnected',
			profileId: this.connectedProfileId,
		}
	}

	async diagnostics(): Promise<MobileVpnDiagnostics> {
		return {
			platform: 'android',
			nativeReady: true,
			readiness: 'ready',
		}
	}

	async probe(input: { readonly host: string; readonly port: number }): Promise<{
		readonly reachable: boolean
		readonly latencyMs?: number
		readonly error?: string
	}> {
		this.lastProbe = input

		return {
			reachable: true,
			latencyMs: 17,
		}
	}
}

describe('mobile VPN Capacitor boundary', () => {
	it('maps the native network identity method to the shared snapshot port', async () => {
		const vpn = new CapacitorMobileVpn(new FakeRahRowVpnPlugin())

		await expect(vpn.snapshot()).resolves.toEqual({
			localAddresses: ['192.168.1.9'],
		})
	})

	it('delegates connect and disconnect to the native plugin contract', async () => {
		const plugin = new FakeRahRowVpnPlugin()
		const vpn = new CapacitorMobileVpn(plugin)

		await vpn.connect({
			profileId: 'profile-1',
			engineConfig: {
				log: { loglevel: 'warning' },
				dns: { servers: ['1.1.1.1'] },
				inbounds: [],
				outbounds: [],
				routing: {
					domainStrategy: 'AsIs',
					rules: [],
				},
			},
		})
		await expect(vpn.status()).resolves.toEqual({
			connected: true,
			state: 'connected',
			profileId: 'profile-1',
		})

		await vpn.disconnect()
		await expect(vpn.status()).resolves.toEqual({
			connected: false,
			state: 'disconnected',
			profileId: undefined,
		})
		expect(plugin.receivedConfig).toMatchObject({
			inbounds: [],
			outbounds: [],
		})
	})

	it('forwards generated Xray config and socks port to the native plugin', async () => {
		const plugin = new FakeRahRowVpnPlugin()
		const vpn = new CapacitorMobileVpn(plugin)

		await vpn.connect({
			profileId: 'profile-1',
			socksPort: 12080,
			engineConfig: {
				log: { loglevel: 'warning' },
				dns: { servers: ['1.1.1.1'] },
				inbounds: [
					{
						tag: 'socks-in',
						protocol: 'socks',
						listen: '127.0.0.1',
						port: 12080,
						settings: { udp: true },
						sniffing: { enabled: true, destOverride: ['http', 'tls'] },
					},
				],
				outbounds: [],
				routing: {
					domainStrategy: 'AsIs',
					rules: [],
				},
			},
		})

		expect(plugin.receivedSocksPort).toBe(12080)
		expect(plugin.receivedConfig).toMatchObject({
			inbounds: [{ protocol: 'socks', port: 12080 }],
		})
		await expect(vpn.probe({ host: 'example.com', port: 443 })).resolves.toEqual({
			reachable: true,
			latencyMs: 17,
		})
		expect(plugin.lastProbe).toEqual({ host: 'example.com', port: 443 })
	})

	it('exposes minimal diagnostics without Android or iOS details in app code', async () => {
		const vpn = new CapacitorMobileVpn(new FakeRahRowVpnPlugin())

		await expect(vpn.diagnostics()).resolves.toEqual({
			platform: 'android',
			nativeReady: true,
			readiness: 'ready',
		})
	})

	it('rejects connect requests without a profile id before touching native code', async () => {
		const plugin = new FakeRahRowVpnPlugin()
		const vpn = new CapacitorMobileVpn(plugin)

		await expect(vpn.connect({ profileId: '' })).rejects.toMatchObject({
			code: 'invalid_profile',
			message: 'Mobile VPN connect requires a profile id',
		})
		expect(plugin.connectedProfileId).toBeUndefined()
	})

	it('reports unsupported web platform as an explicit VPN state', async () => {
		const vpn = createMobileVpn('web')

		await expect(vpn.diagnostics()).resolves.toEqual({
			platform: 'web',
			nativeReady: false,
			readiness: 'unsupported-platform',
			detail: 'RahRow VPN requires Android VPNService or iOS Network Extension.',
		})
		await expect(vpn.status()).resolves.toEqual({
			connected: false,
			supported: false,
			detail: 'RahRow VPN requires Android VPNService or iOS Network Extension.',
			state: 'disconnected',
			readiness: 'unsupported-platform',
			error: 'RahRow VPN requires Android VPNService or iOS Network Extension.',
		})
		await expect(vpn.connect({ profileId: 'profile-1' })).rejects.toMatchObject({
			code: 'unsupported_capability',
			message: 'RahRow VPN requires Android VPNService or iOS Network Extension.',
		})
	})

	it('keeps missing native entitlement states testable at the plugin edge', async () => {
		const vpn = new CapacitorMobileVpn(
			new UnsupportedRahRowVpnPlugin({
				platform: 'ios',
				nativeReady: false,
				readiness: 'missing-vpn-entitlement',
				detail: 'iOS Network Extension entitlement is not available.',
			}),
		)

		await expect(vpn.diagnostics()).resolves.toEqual({
			platform: 'ios',
			nativeReady: false,
			readiness: 'missing-vpn-entitlement',
			detail: 'iOS Network Extension entitlement is not available.',
		})
		await expect(vpn.connect({ profileId: 'profile-1' })).rejects.toMatchObject({
			code: 'unsupported_capability',
			message: 'iOS Network Extension entitlement is not available.',
		})
	})

	it('uses the registered iOS plugin so native diagnostics stay truthful', async () => {
		const plugin = new FakeRahRowVpnPlugin()
		const vpn = createMobileVpn('ios', plugin)

		await expect(vpn.diagnostics()).resolves.toEqual({
			platform: 'android',
			nativeReady: true,
			readiness: 'ready',
		})
		await vpn.connect({ profileId: 'profile-1' })
		expect(plugin.connectedProfileId).toBe('profile-1')
	})
})
