export const DESKTOP_VPN_RELEASE_GATES = [
	'first-connect-consent',
	'visible-os-vpn-state',
	'tcp-ipv4',
	'udp-ipv4',
	'tcp-ipv6',
	'udp-ipv6',
	'dns-leak',
	'upstream-loop-prevention',
	'kill-switch-truth',
	'tunnelvision-posture',
	'captive-portal',
	'sleep-wake',
	'network-handoff',
	'engine-crash-cleanup',
	'ui-crash-cleanup',
	'reboot-cleanup',
	'concurrent-connect-exclusion',
	'xray-sing-box-switch',
	'permission-revocation',
	'uninstall-cleanup',
	'route-dns-rollback',
] as const

export type DesktopVpnReleaseGate = (typeof DESKTOP_VPN_RELEASE_GATES)[number]
export type DesktopVpnGateStatus = 'passed' | 'failed' | 'not-run' | 'blocked'
export type DesktopVpnReleaseChannel = 'unsigned' | 'production'
export type DesktopVpnPlatform = 'macos' | 'windows' | 'linux'

export interface DesktopVpnReleaseEvidence {
	readonly platform: DesktopVpnPlatform
	readonly provider: 'network-extension' | 'wintun-service' | 'linux-tun-service'
	readonly providerInstalled: boolean
	readonly installedLayoutVerified: boolean
	readonly signed: boolean
	readonly gates: Readonly<
		Partial<Record<DesktopVpnReleaseGate, DesktopVpnGateStatus>>
	>
}

export interface DesktopVpnReleaseEvaluation {
	readonly eligible: boolean
	readonly vpnReleaseReady: boolean
	readonly blockers: readonly string[]
}

const providersByPlatform = {
	macos: 'network-extension',
	windows: 'wintun-service',
	linux: 'linux-tun-service',
} as const satisfies Record<
	DesktopVpnPlatform,
	DesktopVpnReleaseEvidence['provider']
>

const gateStatuses = new Set<DesktopVpnGateStatus>([
	'passed',
	'failed',
	'not-run',
	'blocked',
])

export function parseDesktopVpnReleaseEvidence(
	value: unknown,
): DesktopVpnReleaseEvidence {
	if (!isRecord(value)) throw new Error('release evidence must be an object')
	const platform = value.platform
	if (platform !== 'macos' && platform !== 'windows' && platform !== 'linux') {
		throw new Error('platform is invalid')
	}
	if (value.provider !== providersByPlatform[platform]) {
		throw new Error(`${platform} provider is invalid`)
	}
	for (const field of [
		'providerInstalled',
		'installedLayoutVerified',
		'signed',
	] as const) {
		if (typeof value[field] !== 'boolean') {
			throw new Error(`${field} must be a boolean`)
		}
	}
	if (!isRecord(value.gates)) throw new Error('gates must be an object')
	for (const gate of DESKTOP_VPN_RELEASE_GATES) {
		const status = value.gates[gate]
		if (
			status !== undefined &&
			!gateStatuses.has(status as DesktopVpnGateStatus)
		) {
			throw new Error(`${gate} has an invalid status`)
		}
	}

	return value as unknown as DesktopVpnReleaseEvidence
}

export function evaluateDesktopVpnRelease(
	evidence: DesktopVpnReleaseEvidence,
	channel: DesktopVpnReleaseChannel,
): DesktopVpnReleaseEvaluation {
	const missingGates = DESKTOP_VPN_RELEASE_GATES.filter(
		(gate) => evidence.gates[gate] === undefined,
	)
	const unpassedGates = DESKTOP_VPN_RELEASE_GATES.filter(
		(gate) => evidence.gates[gate] !== 'passed',
	)
	const blockers: string[] = []

	if (!evidence.providerInstalled) {
		blockers.push(
			`${evidence.platform}: registered VPN provider is not installed`,
		)
	}
	if (!evidence.installedLayoutVerified) {
		blockers.push(`${evidence.platform}: installed layout has not been verified`)
	}
	if (!evidence.signed) {
		blockers.push(`${evidence.platform}: artifact is not signed`)
	}
	if (missingGates.length > 0) {
		blockers.push(
			`${evidence.platform}: release evidence is missing ${missingGates.length} required lifecycle gates`,
		)
	} else if (unpassedGates.length > 0) {
		blockers.push(
			`${evidence.platform}: ${unpassedGates.length} required lifecycle gates have not passed`,
		)
	}

	const vpnReleaseReady = blockers.length === 0
	return {
		eligible:
			missingGates.length === 0 && (channel === 'unsigned' || vpnReleaseReady),
		vpnReleaseReady,
		blockers,
	}
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}
