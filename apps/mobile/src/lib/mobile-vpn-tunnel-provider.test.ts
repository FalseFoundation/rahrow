import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { describe, expect, it } from 'vitest'

import {
	CapacitorMobileVpn,
	type MobileVpnConnectInput,
	type MobileVpnDiagnostics,
	type MobileVpnStatus,
	type RahRowVpnPlugin,
} from './mobile-vpn.ts'
import { MobileVpnTunnelProvider } from './mobile-vpn-tunnel-provider.ts'

const profile: ConnectionProfile = {
	id: 'profile-1',
	protocol: 'shadowsocks',
	endpoint: { host: 'example.com', port: 8388 },
	authentication: { method: 'aes-256-gcm', password: 'top-secret' },
}

class FakeRahRowVpnPlugin implements RahRowVpnPlugin {
	connectInput: MobileVpnConnectInput | undefined

	constructor(private readonly diagnosticsValue: MobileVpnDiagnostics) {}

	async networkIdentity() {
		return { localAddresses: [] }
	}

	async connect(input: MobileVpnConnectInput): Promise<void> {
		this.connectInput = input
	}

	async disconnect(): Promise<void> {}

	async status(): Promise<MobileVpnStatus> {
		return {
			connected: this.connectInput !== undefined,
			state: this.connectInput ? 'connected' : 'disconnected',
			profileId: this.connectInput?.profileId,
			engineId: this.connectInput?.engineId,
			tunBackendId: this.connectInput?.tunBackendId,
		}
	}

	async diagnostics(): Promise<MobileVpnDiagnostics> {
		return this.diagnosticsValue
	}

	async probe() {
		return { reachable: true }
	}
}

function readyDiagnostics(
	platform: 'android' | 'ios',
	hevRuntime: boolean,
): MobileVpnDiagnostics {
	return {
		platform,
		nativeReady: true,
		readiness: 'ready',
		tunBackends: {
			'engine-native': true,
			'hev-socks5-tunnel': hevRuntime,
		},
	}
}

describe('MobileVpnTunnelProvider', () => {
	it('selects verified HEV on Android with sing-box and builds a loopback proxy config', async () => {
		const plugin = new FakeRahRowVpnPlugin(readyDiagnostics('android', true))
		const provider = new MobileVpnTunnelProvider(
			new CapacitorMobileVpn(plugin),
			'android',
		)

		await provider.start({ profile, engineId: 'sing-box', localPort: 12080 })

		expect(plugin.connectInput).toMatchObject({
			profileId: 'profile-1',
			engineId: 'sing-box',
			socksPort: 12080,
			tunBackendId: 'hev-socks5-tunnel',
			engineConfig: {
				inbounds: [
					{
						type: 'mixed',
						tag: 'mixed-in',
						listen: '127.0.0.1',
						listen_port: 12080,
					},
				],
			},
		})
		expect(plugin.connectInput?.engineConfig).toMatchObject({
			dns: { servers: [{ type: 'local', tag: 'dns-direct' }] },
			route: {
				auto_detect_interface: true,
				final: 'proxy',
				default_domain_resolver: 'dns-direct',
			},
		})
	})

	it('uses HEV + SOCKS for Android Xray (Happ/v2rayNG path)', async () => {
		const plugin = new FakeRahRowVpnPlugin(readyDiagnostics('android', true))
		const provider = new MobileVpnTunnelProvider(
			new CapacitorMobileVpn(plugin),
			'android',
		)

		await provider.start({ profile, engineId: 'xray' })

		expect(plugin.connectInput).toMatchObject({
			engineId: 'xray',
			tunBackendId: 'hev-socks5-tunnel',
			engineConfig: {
				inbounds: [{ tag: 'socks-in', protocol: 'socks' }],
			},
		})
	})

	it.each([
		{
			name: 'iOS where the HEV descriptor bridge is not verified',
			platform: 'ios' as const,
			hevRuntime: true,
		},
		{
			name: 'Android without the pinned HEV runtime',
			platform: 'android' as const,
			hevRuntime: false,
		},
	])(
		'falls back to engine-native on $name',
		async ({ platform, hevRuntime }) => {
			const plugin = new FakeRahRowVpnPlugin(
				readyDiagnostics(platform, hevRuntime),
			)
			const provider = new MobileVpnTunnelProvider(
				new CapacitorMobileVpn(plugin),
				platform,
			)

			await provider.start({ profile, engineId: 'sing-box' })

			expect(plugin.connectInput).toMatchObject({
				engineId: 'sing-box',
				tunBackendId: 'engine-native',
				engineConfig: {
					inbounds: [{ type: 'tun', tag: 'tun-in' }],
					route: { auto_detect_interface: true, final: 'proxy' },
				},
			})
		},
	)
})
