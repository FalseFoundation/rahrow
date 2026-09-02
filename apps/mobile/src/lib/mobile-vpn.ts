import { Capacitor, registerPlugin } from '@capacitor/core'
import { RahrowError } from '@rahrow/core/errors.ts'
import type {
	NetworkIdentity,
	NetworkIdentitySnapshot,
	Vpn,
	VpnInput,
	VpnStatus,
} from '@rahrow/core/platform/capabilities.ts'
import type { TunBackendId } from '@rahrow/core/platform/tun-backend.ts'
import type { EngineId } from '@rahrow/core/runtime/proxy-engine.ts'
import type { SingBoxConfig } from '@rahrow/engine/sing-box/sing-box-engine.ts'
import type { XrayConfig } from '@rahrow/engine/xray/xray-engine.ts'

export type MobileVpnPlatform = 'android' | 'ios' | 'web' | 'unknown'
export type MobileVpnReadiness =
	| 'ready'
	| 'missing-native-plugin'
	| 'missing-vpn-entitlement'
	| 'unsupported-platform'
export type MobileVpnState =
	| 'disconnected'
	| 'connecting'
	| 'connected'
	| 'disconnecting'
	| 'error'

export interface MobileVpnConnectInput extends VpnInput {
	readonly engineId?: EngineId
	readonly engineConfig?: XrayConfig | SingBoxConfig
	readonly socksPort?: number
	readonly tunBackendId?: TunBackendId
}

export interface MobileVpnProbeInput {
	readonly host: string
	readonly port: number
}

export interface MobileVpnProbeResult {
	readonly reachable: boolean
	readonly latencyMs?: number
	readonly error?: string
}

export interface MobileVpnStatus extends VpnStatus {
	readonly state: MobileVpnState
	readonly profileId?: string
	readonly engineId?: EngineId
	readonly tunBackendId?: TunBackendId
	readonly error?: string
	readonly readiness?: MobileVpnReadiness
}

export interface MobileVpnDiagnostics {
	readonly platform: MobileVpnPlatform
	readonly nativeReady: boolean
	readonly readiness: MobileVpnReadiness
	readonly activeConnectionInBackground?: boolean
	readonly periodicSmartConnectInBackground?:
		| 'continuous'
		| 'opportunistic'
		| 'unavailable'
	readonly detail?: string
	readonly tunBackends?: Readonly<Record<TunBackendId, boolean>>
}

export interface RahRowVpnPlugin {
	networkIdentity(): Promise<NetworkIdentitySnapshot>
	connect(input: MobileVpnConnectInput): Promise<void>
	disconnect(): Promise<void>
	status(): Promise<MobileVpnStatus>
	diagnostics(): Promise<MobileVpnDiagnostics>
	probe(input: MobileVpnProbeInput): Promise<MobileVpnProbeResult>
}

export class CapacitorMobileVpn implements Vpn, NetworkIdentity {
	constructor(private readonly plugin: RahRowVpnPlugin = nativeRahRowVpn) {}

	async connect(input: MobileVpnConnectInput): Promise<void> {
		if (!input.profileId) {
			throw new RahrowError(
				'invalid_profile',
				'Mobile VPN connect requires a profile id',
			)
		}

		await mapNativeError(() => this.plugin.connect(input))
	}

	async snapshot(): Promise<NetworkIdentitySnapshot> {
		return mapNativeError(() => this.plugin.networkIdentity())
	}

	async disconnect(): Promise<void> {
		await mapNativeError(() => this.plugin.disconnect())
	}

	async status(): Promise<MobileVpnStatus> {
		const status = await mapNativeError(() => this.plugin.status())
		if (!status.readiness) {
			return status
		}

		return {
			...status,
			supported: status.readiness === 'ready',
		}
	}

	async diagnostics(): Promise<MobileVpnDiagnostics> {
		return mapNativeError(() => this.plugin.diagnostics())
	}

	async probe(input: MobileVpnProbeInput): Promise<MobileVpnProbeResult> {
		return mapNativeError(() => this.plugin.probe(input))
	}
}

export class UnsupportedRahRowVpnPlugin implements RahRowVpnPlugin {
	constructor(private readonly diagnosticsValue: MobileVpnDiagnostics) {}

	async connect(): Promise<void> {
		throw unsupportedVpn(this.diagnosticsValue)
	}

	async networkIdentity(): Promise<NetworkIdentitySnapshot> {
		return { localAddresses: [] }
	}

	async disconnect(): Promise<void> {}

	async status(): Promise<MobileVpnStatus> {
		return {
			connected: false,
			supported: false,
			detail: this.diagnosticsValue.detail,
			state: 'disconnected',
			readiness: this.diagnosticsValue.readiness,
			error: this.diagnosticsValue.detail,
		}
	}

	async diagnostics(): Promise<MobileVpnDiagnostics> {
		return this.diagnosticsValue
	}

	async probe(): Promise<MobileVpnProbeResult> {
		throw unsupportedVpn(this.diagnosticsValue)
	}
}

export const nativeRahRowVpn = registerPlugin<RahRowVpnPlugin>('RahRowVpn')

export function createMobileVpn(
	platform: MobileVpnPlatform = currentMobilePlatform(),
	plugin: RahRowVpnPlugin = nativeRahRowVpn,
): CapacitorMobileVpn {
	if (platform === 'android' || platform === 'ios') {
		return new CapacitorMobileVpn(plugin)
	}

	return new CapacitorMobileVpn(
		new UnsupportedRahRowVpnPlugin({
			platform,
			nativeReady: false,
			readiness: 'unsupported-platform',
			detail: 'RahRow VPN requires Android VPNService or iOS Network Extension.',
		}),
	)
}

export const mobileVpn = createMobileVpn()

function currentMobilePlatform(): MobileVpnPlatform {
	const platform = Capacitor.getPlatform()

	if (platform === 'android' || platform === 'ios' || platform === 'web') {
		return platform
	}

	return 'unknown'
}

async function mapNativeError<T>(command: () => Promise<T>): Promise<T> {
	try {
		return await command()
	} catch (error) {
		if (error instanceof RahrowError) {
			throw error
		}

		throw new RahrowError(
			'unsupported_capability',
			error instanceof Error ? error.message : 'Mobile VPN native bridge failed',
			{ cause: error },
		)
	}
}

function unsupportedVpn(diagnostics: MobileVpnDiagnostics): RahrowError {
	return new RahrowError(
		'unsupported_capability',
		diagnostics.detail ?? 'Mobile VPN native bridge is not available',
	)
}
