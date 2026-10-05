import { isIsoCountryCode } from '@rahrow/core/platform/egress-identity.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { translate } from '../app/app-i18n.tsx'

const connectionStateLabels: Record<string, string> = {
	disconnected: 'connectionState.disconnected',
	connecting: 'connectionState.connecting',
	connected: 'connectionState.connected',
	disconnecting: 'connectionState.disconnecting',
	error: 'connectionState.error',
	unavailable: 'connectionState.unavailable',
	checking: 'connectionState.checking',
}

export function formatConnectionState(state: string): string {
	return connectionStateLabels[state]
		? translate(connectionStateLabels[state])
		: state
}

export function canConnect(state: string): boolean {
	return state === 'disconnected' || state === 'error' || state === 'unavailable'
}

export function canDisconnect(state: string): boolean {
	return state === 'connected' || state === 'connecting'
}

/** Live session states may override the persisted selection with the connected profile. */
export function isLiveConnectionState(state: string): boolean {
	return (
		state === 'connected' || state === 'connecting' || state === 'disconnecting'
	)
}

/**
 * Prefer the live session profile while connected; otherwise use the persisted
 * Connections selection so a stale disconnected snapshot cannot pin Home.
 */
export function preferredSelectedProfileId(input: {
	readonly connectionState: string
	readonly connectionProfileId?: string
	readonly activeProfileId?: string
}): string | undefined {
	if (
		input.connectionProfileId &&
		isLiveConnectionState(input.connectionState)
	) {
		return input.connectionProfileId
	}
	return input.activeProfileId
}

/**
 * Resolve a Home selection that always exists in the current profile library.
 * Live tunnel ids that are missing from storage must not wipe the UI into the
 * empty state while the session is still connected.
 *
 * While disconnected, prefer the persisted Connections selection over a stale
 * in-memory Home id so tab keep-alive still picks up library activations.
 * While live, prefer the connected session profile when it is still in the
 * library; otherwise fall back through settings / current / first profile.
 */
export function resolveHomeSelectedProfileId(input: {
	readonly profiles: readonly { readonly id: string }[]
	readonly connectionState: string
	readonly connectionProfileId?: string
	readonly connectionProfile?: { readonly id: string }
	readonly activeProfileId?: string
	readonly currentSelectedProfileId?: string
}): string {
	const live = isLiveConnectionState(input.connectionState)
	const liveId = live
		? (input.connectionProfileId ?? input.connectionProfile?.id)
		: undefined
	const candidates = live
		? [
				liveId,
				input.activeProfileId,
				input.currentSelectedProfileId,
				input.profiles[0]?.id,
			]
		: [
				input.activeProfileId,
				input.currentSelectedProfileId,
				input.profiles[0]?.id,
			]
	for (const candidate of candidates) {
		if (
			candidate &&
			input.profiles.some((profile) => profile.id === candidate)
		) {
			return candidate
		}
	}
	return ''
}

export function profileLabel(profile: ConnectionProfile): string {
	return (
		profile.metadata?.name ??
		`${profile.protocol} ${profile.endpoint.host}:${profile.endpoint.port}`
	)
}

export function countryPresentation(
	countryCode: string | undefined,
	locale: string,
): { readonly flag: string; readonly name: string } | null {
	if (!countryCode || !isIsoCountryCode(countryCode)) return null
	try {
		const name = new Intl.DisplayNames([locale], { type: 'region' }).of(
			countryCode,
		)
		if (!name || name === countryCode) return null
		return {
			flag: String.fromCodePoint(
				...countryCode
					.split('')
					.map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65),
			),
			name,
		}
	} catch {
		return null
	}
}

export function connectionModeLabel(input: {
	readonly connectionMode: 'vpn' | 'proxy'
	readonly vpnSupported: boolean
	readonly systemProxySupported: boolean
}): string {
	if (input.connectionMode === 'proxy') return translate('home.mode.proxy')
	if (!input.vpnSupported)
		return input.systemProxySupported
			? translate('home.mode.proxyAvailable')
			: translate('home.mode.vpnUnavailable')
	return translate('home.mode.vpn')
}

export function connectionModeUnavailableReason(input: {
	readonly connectionMode: 'vpn' | 'proxy'
	readonly vpnSupported: boolean
	readonly systemProxySupported: boolean
}): string | null {
	if (input.connectionMode === 'vpn') {
		if (input.vpnSupported) return null
		return input.systemProxySupported
			? translate('home.errors.switchToProxy')
			: translate('home.errors.vpnUnavailable')
	}

	if (input.systemProxySupported) return null
	return input.vpnSupported
		? translate('home.errors.switchToVpn')
		: translate('home.errors.proxyUnavailable')
}

/** Proxy mode is easy to misunderstand as full-device protection. */
export function proxyLeakNotice(input: {
	readonly connectionMode: 'vpn' | 'proxy'
	readonly vpnSupported: boolean
}): string | null {
	if (input.connectionMode !== 'proxy') return null
	return input.vpnSupported
		? translate('home.mode.proxyLeakNotice')
		: translate('home.mode.proxyLeakNoticeNoVpn')
}

export function homeDisplay(input: {
	readonly hasProfile: boolean
	readonly connectionState: string
	readonly engineStatus: string
	readonly latency: unknown | null
}) {
	const live = isLiveConnectionState(input.connectionState)
	return {
		showEmptyState: !input.hasProfile && !live,
		showEngineStatus:
			(input.hasProfile || live) &&
			input.engineStatus !== 'unknown' &&
			input.engineStatus !== 'stopped',
		showLatency: input.hasProfile && input.latency !== null,
		showRoute: (input.hasProfile || live) && input.connectionState === 'connected',
	}
}
