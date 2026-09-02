import { describe, expect, it } from 'vitest'

import {
	DESKTOP_VPN_RELEASE_GATES,
	type DesktopVpnReleaseEvidence,
	evaluateDesktopVpnRelease,
	parseDesktopVpnReleaseEvidence,
} from './vpn-release-gates.ts'

function evidence(
	overrides: Partial<DesktopVpnReleaseEvidence> = {},
): DesktopVpnReleaseEvidence {
	return {
		platform: 'linux',
		provider: 'linux-tun-service',
		providerInstalled: false,
		installedLayoutVerified: false,
		signed: false,
		gates: Object.fromEntries(
			DESKTOP_VPN_RELEASE_GATES.map((gate) => [gate, 'not-run']),
		),
		...overrides,
	}
}

describe('desktop VPN release evidence', () => {
	it('keeps structurally complete unsigned artifacts eligible without claiming VPN support', () => {
		const result = evaluateDesktopVpnRelease(evidence(), 'unsigned')

		expect(result).toEqual({
			eligible: true,
			vpnReleaseReady: false,
			blockers: [
				'linux: registered VPN provider is not installed',
				'linux: installed layout has not been verified',
				'linux: artifact is not signed',
				'linux: 21 required lifecycle gates have not passed',
			],
		})
	})

	it('fails a production release until signing, provider install, and every lifecycle gate pass', () => {
		const result = evaluateDesktopVpnRelease(evidence(), 'production')

		expect(result.eligible).toBe(false)
		expect(result.vpnReleaseReady).toBe(false)
		expect(result.blockers).toContain(
			'linux: registered VPN provider is not installed',
		)
		expect(result.blockers).toContain('linux: artifact is not signed')
		expect(result.blockers).toContain(
			'linux: installed layout has not been verified',
		)
	})

	it('rejects incomplete evidence even for an unsigned artifact', () => {
		const result = evaluateDesktopVpnRelease(
			evidence({ gates: { 'first-connect-consent': 'not-run' } }),
			'unsigned',
		)

		expect(result.eligible).toBe(false)
		expect(result.blockers).toContain(
			'linux: release evidence is missing 20 required lifecycle gates',
		)
	})

	it('accepts a signed provider only when every required gate passed', () => {
		const result = evaluateDesktopVpnRelease(
			evidence({
				providerInstalled: true,
				installedLayoutVerified: true,
				signed: true,
				gates: Object.fromEntries(
					DESKTOP_VPN_RELEASE_GATES.map((gate) => [gate, 'passed']),
				),
			}),
			'production',
		)

		expect(result).toEqual({
			eligible: true,
			vpnReleaseReady: true,
			blockers: [],
		})
	})

	it('rejects malformed committed evidence instead of trusting JSON assertions', () => {
		expect(() =>
			parseDesktopVpnReleaseEvidence({ ...evidence(), signed: 'yes' }),
		).toThrow('signed must be a boolean')
		expect(() =>
			parseDesktopVpnReleaseEvidence({
				...evidence(),
				gates: {
					...evidence().gates,
					'dns-leak': 'claimed',
				},
			}),
		).toThrow('dns-leak has an invalid status')
	})
})
