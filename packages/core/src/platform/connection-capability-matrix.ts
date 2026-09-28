import type { ConnectionMode } from '../connection/connection-mode.ts'
import type { EngineId } from '../runtime/proxy-engine.ts'

export type ConnectionPlatform =
	| 'android'
	| 'ios'
	| 'macos'
	| 'linux'
	| 'windows'
	| 'cli'

export type ConnectionCapabilityReason =
	| 'unsupported-engine'
	| 'unsupported-platform-mode'
	| 'adapter-unverified'
	| 'missing-runtime'
	| 'missing-engine-adapter'
	| 'disabled-build-capability'
	| 'unsupported-architecture'
	| 'missing-native-provider'
	| 'missing-system-proxy-adapter'
	| 'permission-required'

export type ConnectionCapabilityStatus =
	| 'available'
	| 'temporarily-unavailable'
	| 'unsupported'

export interface ConnectionCapabilityInput {
	readonly platform: ConnectionPlatform
	readonly engineId: EngineId
	readonly mode: ConnectionMode
	readonly runtimeBundled: boolean
	readonly engineAdapterAvailable: boolean
	readonly buildEnabled: boolean
	readonly architectureSupported: boolean
	readonly nativeProviderAvailable?: boolean
	readonly systemProxyAvailable?: boolean
	readonly permissionGranted?: boolean
}

export interface ConnectionCapability {
	readonly platform: ConnectionPlatform
	readonly engineId: EngineId
	readonly mode: ConnectionMode
	readonly status: ConnectionCapabilityStatus
	readonly reason?: ConnectionCapabilityReason
}

export interface ConnectionModeChoice extends ConnectionCapability {
	readonly label: 'VPN/TUN' | 'System proxy'
}

const productEngines = new Set<EngineId>(['xray', 'sing-box'])

export function connectionCapability(
	input: ConnectionCapabilityInput,
): ConnectionCapability {
	const base = {
		platform: input.platform,
		engineId: input.engineId,
		mode: input.mode,
	}
	if (!productEngines.has(input.engineId)) {
		return { ...base, status: 'unsupported', reason: 'unsupported-engine' }
	}
	if (!structurallySupports(input.platform, input.mode)) {
		return {
			...base,
			status: 'unsupported',
			reason: 'unsupported-platform-mode',
		}
	}
	if (
		input.platform === 'android' &&
		input.engineId === 'xray' &&
		input.mode === 'vpn'
	) {
		return { ...base, status: 'unsupported', reason: 'adapter-unverified' }
	}

	const unavailable = firstUnavailableReason(input)
	return unavailable
		? { ...base, status: 'temporarily-unavailable', reason: unavailable }
		: { ...base, status: 'available' }
}

export function connectionModeChoices(
	input: Omit<ConnectionCapabilityInput, 'mode'>,
): readonly ConnectionModeChoice[] {
	return (['vpn', 'proxy'] as const)
		.map((mode) => connectionCapability({ ...input, mode }))
		.filter((capability) => capability.status !== 'unsupported')
		.map((capability) => ({
			...capability,
			label: capability.mode === 'vpn' ? 'VPN/TUN' : 'System proxy',
		}))
}

function structurallySupports(
	platform: ConnectionPlatform,
	mode: ConnectionMode,
): boolean {
	if (platform === 'cli') return mode === 'proxy'
	if (platform === 'android' || platform === 'ios') return mode === 'vpn'
	return true
}

function firstUnavailableReason(
	input: ConnectionCapabilityInput,
): ConnectionCapabilityReason | undefined {
	if (!input.runtimeBundled) return 'missing-runtime'
	if (!input.engineAdapterAvailable) return 'missing-engine-adapter'
	if (!input.buildEnabled) return 'disabled-build-capability'
	if (!input.architectureSupported) return 'unsupported-architecture'
	if (input.mode === 'vpn' && !input.nativeProviderAvailable)
		return 'missing-native-provider'
	if (
		input.mode === 'proxy' &&
		input.platform !== 'cli' &&
		!input.systemProxyAvailable
	)
		return 'missing-system-proxy-adapter'
	if (input.mode === 'vpn' && input.permissionGranted === false)
		return 'permission-required'
	return undefined
}
