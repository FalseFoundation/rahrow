import type { Clock } from '@rahrow/core/connection/connection-controller.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type {
	EngineId,
	LatencyResult,
} from '@rahrow/core/runtime/proxy-engine.ts'
import type {
	SingBoxConfig,
	SingBoxLatencyProbe,
	SingBoxProcess,
} from '@rahrow/engine/sing-box/sing-box-engine.ts'
import {
	SystemClock,
	type XrayConfig,
	type XrayLatencyProbe,
	type XrayProcess,
} from '@rahrow/engine/xray/xray-engine.ts'

import type { CapacitorMobileVpn } from './mobile-vpn.ts'

export class CapacitorEngineProcess implements XrayProcess, SingBoxProcess {
	profileId = ''

	constructor(
		private readonly engineId: EngineId,
		private readonly vpn: CapacitorMobileVpn,
	) {}

	async start(config: XrayConfig | SingBoxConfig): Promise<void> {
		const inbound = config.inbounds[0]
		const socksPort =
			inbound && 'port' in inbound
				? inbound.port
				: inbound && 'listen_port' in inbound
					? inbound.listen_port
					: 10808

		await this.vpn.connect({
			profileId: this.profileId,
			engineId: this.engineId,
			engineConfig: config,
			socksPort,
		})
	}

	async stop(): Promise<void> {
		await this.vpn.disconnect()
	}
}

export class CapacitorEngineLatencyProbe
	implements XrayLatencyProbe, SingBoxLatencyProbe
{
	constructor(
		private readonly vpn: CapacitorMobileVpn,
		private readonly clock: Clock = new SystemClock(),
	) {}

	async test(profile: ConnectionProfile): Promise<LatencyResult> {
		const result = await this.vpn.probe({
			host: profile.endpoint.host,
			port: profile.endpoint.port,
		})

		return {
			profileId: profile.id,
			reachable: result.reachable,
			checkedAt: this.clock.now(),
			latencyMs: result.latencyMs,
			error: result.error,
		}
	}
}
