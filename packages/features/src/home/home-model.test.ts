import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { describe, expect, it } from 'vitest'

import {
	canConnect,
	canDisconnect,
	connectionModeLabel,
	connectionModeUnavailableReason,
	countryPresentation,
	formatConnectionState,
	homeDisplay,
	isLiveConnectionState,
	preferredSelectedProfileId,
	profileLabel,
	proxyLeakNotice,
	resolveHomeSelectedProfileId,
} from './home-model.ts'

const profile: ConnectionProfile = {
	id: 'profile-1',
	protocol: 'vless',
	endpoint: {
		host: 'example.com',
		port: 443,
	},
	authentication: {
		id: '11111111-1111-4111-8111-111111111111',
	},
	metadata: {
		name: 'Home',
	},
}

describe('home-model', () => {
	it('formats connection state for the Home screen', () => {
		expect(formatConnectionState('connected')).toBe('Connected')
		expect(formatConnectionState('disconnected')).toBe('Disconnected')
		expect(formatConnectionState('connecting')).toBe('Connecting')
	})

	it('only allows Connect while disconnected or in error', () => {
		expect(canConnect('disconnected')).toBe(true)
		expect(canConnect('error')).toBe(true)
		expect(canConnect('connected')).toBe(false)
		expect(canConnect('connecting')).toBe(false)
	})

	it('only allows Disconnect while a session is active', () => {
		expect(canDisconnect('connected')).toBe(true)
		expect(canDisconnect('connecting')).toBe(true)
		expect(canDisconnect('disconnected')).toBe(false)
	})

	it('treats only live session states as able to override selection', () => {
		expect(isLiveConnectionState('connected')).toBe(true)
		expect(isLiveConnectionState('connecting')).toBe(true)
		expect(isLiveConnectionState('disconnecting')).toBe(true)
		expect(isLiveConnectionState('disconnected')).toBe(false)
		expect(isLiveConnectionState('error')).toBe(false)
	})

	it('keeps the persisted Connections selection when the session is idle', () => {
		expect(
			preferredSelectedProfileId({
				connectionState: 'disconnected',
				connectionProfileId: 'stale-germany',
				activeProfileId: 'netherlands',
			}),
		).toBe('netherlands')
		expect(
			preferredSelectedProfileId({
				connectionState: 'connected',
				connectionProfileId: 'live-germany',
				activeProfileId: 'netherlands',
			}),
		).toBe('live-germany')
	})

	it('formats profile labels for the Home screen', () => {
		expect(profileLabel(profile)).toBe('Home')
		expect(
			profileLabel({
				...profile,
				metadata: undefined,
			}),
		).toBe('vless example.com:443')
	})

	it('never resolves a live snapshot profile id that is missing from the library', () => {
		expect(
			resolveHomeSelectedProfileId({
				profiles: [{ id: 'home-profile' }],
				connectionState: 'connected',
				connectionProfileId: 'orphan-from-tunnel',
				activeProfileId: 'home-profile',
			}),
		).toBe('home-profile')
		expect(
			resolveHomeSelectedProfileId({
				profiles: [{ id: 'only-profile' }],
				connectionState: 'connected',
				connectionProfileId: 'orphan-from-tunnel',
			}),
		).toBe('only-profile')
	})

	it('prefers persisted Connections selection over a stale Home id while idle', () => {
		expect(
			resolveHomeSelectedProfileId({
				profiles: [{ id: 'old-home' }, { id: 'new-from-library' }],
				connectionState: 'disconnected',
				activeProfileId: 'new-from-library',
				currentSelectedProfileId: 'old-home',
			}),
		).toBe('new-from-library')
	})

	it('prefers the live snapshot profile object when its id is in the library', () => {
		expect(
			resolveHomeSelectedProfileId({
				profiles: [{ id: 'live-profile' }, { id: 'other' }],
				connectionState: 'connected',
				connectionProfile: { id: 'live-profile' },
				activeProfileId: 'other',
			}),
		).toBe('live-profile')
	})

	it('only presents connection details when they carry useful information', () => {
		expect(
			homeDisplay({
				hasProfile: false,
				connectionState: 'disconnected',
				engineStatus: 'stopped',
				latency: null,
			}),
		).toEqual({
			showEmptyState: true,
			showEngineStatus: false,
			showLatency: false,
			showRoute: false,
		})

		expect(
			homeDisplay({
				hasProfile: false,
				connectionState: 'connected',
				engineStatus: 'running',
				latency: null,
			}),
		).toEqual({
			showEmptyState: false,
			showEngineStatus: true,
			showLatency: false,
			showRoute: true,
		})

		expect(
			homeDisplay({
				hasProfile: true,
				connectionState: 'connected',
				engineStatus: 'running',
				latency: { reachable: true, latencyMs: 42 },
			}),
		).toEqual({
			showEmptyState: false,
			showEngineStatus: true,
			showLatency: true,
			showRoute: true,
		})
	})

	it('derives an accessible flag only from a validated ISO country code', () => {
		expect(countryPresentation('NL', 'en')).toEqual({
			flag: '🇳🇱',
			name: 'Netherlands',
		})
		expect(countryPresentation('ZZ', 'en')).toBeNull()
		expect(countryPresentation(undefined, 'en')).toBeNull()
	})

	it('describes the usable connection mode instead of an unavailable engine path', () => {
		expect(
			connectionModeLabel({
				connectionMode: 'vpn',
				vpnSupported: false,
				systemProxySupported: true,
			}),
		).toBe('PROXY MODE AVAILABLE')
		expect(
			connectionModeLabel({
				connectionMode: 'proxy',
				vpnSupported: false,
				systemProxySupported: true,
			}),
		).toBe('PROXY MODE')
	})

	it('explains why the selected native connection mode cannot start', () => {
		expect(
			connectionModeUnavailableReason({
				connectionMode: 'vpn',
				vpnSupported: false,
				systemProxySupported: true,
			}),
		).toBe('VPN mode is unavailable. Switch to System proxy in Settings.')
		expect(
			connectionModeUnavailableReason({
				connectionMode: 'proxy',
				vpnSupported: true,
				systemProxySupported: false,
			}),
		).toBe('System proxy mode is unavailable. Switch to VPN in Settings.')
		expect(
			connectionModeUnavailableReason({
				connectionMode: 'vpn',
				vpnSupported: true,
				systemProxySupported: false,
			}),
		).toBeNull()
	})

	it('warns that proxy mode is not a kill switch', () => {
		expect(
			proxyLeakNotice({
				connectionMode: 'vpn',
				vpnSupported: false,
			}),
		).toBeNull()
		expect(
			proxyLeakNotice({
				connectionMode: 'proxy',
				vpnSupported: true,
			}),
		).toContain('not a kill switch')
		expect(
			proxyLeakNotice({
				connectionMode: 'proxy',
				vpnSupported: false,
			}),
		).toContain('VPN/TUN is unavailable')
	})
})
