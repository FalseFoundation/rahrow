import type { Vpn } from '@rahrow/core/platform/capabilities.ts'
import type {
	VpnTunnelAvailability,
	VpnTunnelProvider,
	VpnTunnelStartInput,
	VpnTunnelStatus,
} from '@rahrow/core/platform/vpn-tunnel-provider.ts'
import type { EngineId } from '@rahrow/core/runtime/proxy-engine.ts'

/** Compatibility edge until each desktop target exposes its registered provider API. */
export class DesktopVpnTunnelProvider implements VpnTunnelProvider {
	private profileId: string | undefined
	private engineId: EngineId | undefined

	constructor(private readonly vpn: Vpn) {}

	async availability(): Promise<VpnTunnelAvailability> {
		const status = await this.vpn.status()
		return status.supported
			? { available: true }
			: {
					available: false,
					reason: 'missing-provider',
					detail:
						status.detail ?? 'This build has no registered OS tunnel provider.',
				}
	}

	async start(input: VpnTunnelStartInput): Promise<void> {
		if (input.signal?.aborted) throw new Error('VPN start was cancelled')
		await this.vpn.connect({ profileId: input.profile.id })
		this.profileId = input.profile.id
		this.engineId = input.engineId
	}

	async stop(): Promise<void> {
		await this.vpn.disconnect()
		this.profileId = undefined
		this.engineId = undefined
	}

	async status(): Promise<VpnTunnelStatus> {
		const status = await this.vpn.status()
		return {
			state:
				status.supported === false
					? 'unavailable'
					: status.connected
						? 'connected'
						: 'disconnected',
			profileId: status.connected ? this.profileId : undefined,
			engineId: status.connected ? this.engineId : undefined,
			detail: status.detail,
		}
	}
}
