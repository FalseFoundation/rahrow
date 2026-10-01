import {
	defaultTunBackend,
	type TunBackendId,
} from '@rahrow/core/platform/tun-backend.ts'
import type {
	VpnTunnelAvailability,
	VpnTunnelProvider,
	VpnTunnelStartInput,
	VpnTunnelStatus,
} from '@rahrow/core/platform/vpn-tunnel-provider.ts'
import type { EngineId } from '@rahrow/core/runtime/proxy-engine.ts'
import { SingBoxConfigBuilder } from '@rahrow/engine/sing-box/sing-box-engine.ts'
import { XrayConfigBuilder } from '@rahrow/engine/xray/xray-engine.ts'

import type {
	CapacitorMobileVpn,
	MobileVpnPlatform,
	MobileVpnReadiness,
} from './mobile-vpn.ts'

export class MobileVpnTunnelProvider implements VpnTunnelProvider {
	private engineId: EngineId | undefined
	private tunBackendId: TunBackendId | undefined

	constructor(
		private readonly vpn: CapacitorMobileVpn,
		private readonly platform: MobileVpnPlatform = 'unknown',
	) {}

	async availability(): Promise<VpnTunnelAvailability> {
		const diagnostics = await this.vpn.diagnostics()
		if (diagnostics.nativeReady) return { available: true }

		return {
			available: false,
			reason: unavailableReason(diagnostics.readiness),
			detail: diagnostics.detail ?? 'Mobile VPN provider is unavailable.',
		}
	}

	async start(input: VpnTunnelStartInput): Promise<void> {
		if (input.signal?.aborted) throw new Error('VPN start was cancelled')
		const diagnostics = await this.vpn.diagnostics()
		const tunBackend = defaultTunBackend({
			platform:
				this.platform === 'web' || this.platform === 'unknown'
					? 'cli'
					: this.platform,
			hevRuntime:
				diagnostics.tunBackends?.['hev-socks5-tunnel'] === true
					? 'verified'
					: 'missing',
			nativeTunnel: diagnostics.nativeReady,
			// sing-box PlatformInterface.protect and libXray DialerController.protectFd
			// both exempt upstream sockets from the VPN route (Happ/v2rayNG model).
			socketBypass: input.engineId === 'sing-box' || input.engineId === 'xray',
		})

		const configInput = {
			profile: input.profile,
			mode:
				tunBackend.id === 'hev-socks5-tunnel'
					? ('proxy' as const)
					: ('vpn' as const),
			localPort: input.localPort,
			signal: input.signal,
		}
		const engineConfig =
			input.engineId === 'xray'
				? new XrayConfigBuilder().build(configInput)
				: input.engineId === 'sing-box'
					? new SingBoxConfigBuilder().build(configInput)
					: undefined

		if (!engineConfig)
			throw new Error(`Unsupported VPN engine: ${input.engineId}`)

		await this.vpn.connect({
			profileId: input.profile.id,
			engineId: input.engineId,
			engineConfig,
			socksPort: input.localPort ?? 10808,
			tunBackendId: tunBackend.id,
		})
		this.engineId = input.engineId
		this.tunBackendId = tunBackend.id
	}

	async stop(): Promise<void> {
		await this.vpn.disconnect()
		this.engineId = undefined
		this.tunBackendId = undefined
	}

	async status(): Promise<VpnTunnelStatus> {
		const status = await this.vpn.status()
		return {
			state: status.supported === false ? 'unavailable' : status.state,
			profileId: status.profileId,
			engineId: status.engineId ?? this.engineId,
			tunBackendId: status.tunBackendId ?? this.tunBackendId,
			detail: status.error ?? status.detail,
		}
	}
}

function unavailableReason(readiness: MobileVpnReadiness) {
	if (readiness === 'missing-vpn-entitlement')
		return 'missing-entitlement' as const
	if (readiness === 'unsupported-platform')
		return 'unsupported-platform' as const
	if (readiness === 'missing-native-plugin') return 'missing-provider' as const
	return 'missing-runtime' as const
}
