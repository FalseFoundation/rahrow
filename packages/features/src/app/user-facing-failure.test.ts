import { describe, expect, it } from 'vitest'

import {
	classifyConnectFailure,
	connectionFailure,
} from './user-facing-failure.ts'

describe('classifyConnectFailure', () => {
	it.each([
		[
			'Local port 10808 is already in use. Stop the other local proxy.',
			'portInUse',
		],
		['listen tcp 127.0.0.1:10808: bind: address already in use', 'portInUse'],
		[
			'Android did not allow RahRow to start a VPN. If another VPN app has Always-on VPN enabled, turn that off in system settings.',
			'vpnPermission',
		],
		['VPN permission was not granted.', 'elevation'],
		[
			'VPN mode cannot start: this RahRow binary is writable by other users (common on NTFS project disks), so pkexec refuses it.',
			'elevation',
		],
		[
			'VPN mode needs polkit (pkexec), which is not installed on this system. Install polkit or choose Proxy.',
			'modeUnavailable',
		],
		[
			'This Windows build has no installed privileged Wintun service integration. VPN mode is unavailable; choose Proxy explicitly.',
			'modeUnavailable',
		],
		[
			'System proxy fallback is not available on mobile. Use VPN/TUN mode.',
			'modeUnavailable',
		],
		[
			'System proxy is already enabled. Disable it before using RahRow proxy fallback.',
			'systemProxyBusy',
		],
		[
			'sing-box sidecar was not found. Set RAHROW_SING_BOX_BINARY.',
			'engineMissing',
		],
		[
			'Pinned libXray.aar runtime is missing libgojni.so for this Android ABI',
			'engineMissing',
		],
		['command rahrow_vpn_start exited with status 1', 'unknown'],
	])('classifies %j as %s', (message, kind) => {
		expect(classifyConnectFailure(new Error(message))).toBe(kind)
	})

	it('uses the error code when the message is not specific', () => {
		expect(
			classifyConnectFailure(
				Object.assign(new Error('Engine failed'), { code: 'engine_not_found' }),
			),
		).toBe('engineMissing')
	})
})

describe('connectionFailure', () => {
	it('opens system VPN settings for a refused VPN only where the platform supports it', () => {
		const cause = new Error('Android did not allow RahRow to start a VPN.')

		expect(
			connectionFailure('connect', cause, { canOpenSystemVpnSettings: true }),
		).toMatchObject({
			kind: 'vpnPermission',
			recovery: { kind: 'systemVpnSettings' },
		})
		expect(connectionFailure('connect', cause)).toMatchObject({
			kind: 'vpnPermission',
			recovery: { kind: 'retry' },
		})
	})

	it('keeps unknown failures on the generic retry copy', () => {
		expect(connectionFailure('connect', new Error('boom'))).toMatchObject({
			kind: 'unknown',
			description:
				'RahRow could not start the secure tunnel. Check Diagnostics, then try again.',
			recovery: { kind: 'retry' },
		})
	})

	it('offers one-tap free-port recovery when a free port is known', () => {
		expect(
			connectionFailure(
				'connect',
				new Error('Local port 10808 is already in use.'),
				{ freeLocalPort: 20808 },
			),
		).toMatchObject({
			kind: 'portInUse',
			recovery: { kind: 'useFreePort', port: 20808 },
			recoveryLabel: 'Use 20808 and connect',
			description: expect.stringContaining('20808'),
		})
	})

	it('names the occupying local proxy in port-conflict copy when known', () => {
		expect(
			connectionFailure(
				'connect',
				new Error(
					"Local port 10808 is already in use by v2rayN. Stop v2rayN, or change RahRow's local port in Settings.",
				),
				{ freeLocalPort: 20808 },
			),
		).toMatchObject({
			kind: 'portInUse',
			recovery: { kind: 'useFreePort', port: 20808 },
			description: expect.stringContaining('v2rayN'),
		})
		expect(
			connectionFailure(
				'connect',
				new Error(
					"Local port 10808 is already in use by Clash Verge. Stop Clash Verge, or change RahRow's local port in Settings.",
				),
			).description,
		).toContain('Clash Verge')
	})
})
