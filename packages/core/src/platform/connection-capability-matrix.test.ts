import { describe, expect, it } from 'vitest'

import {
	connectionCapability,
	connectionModeChoices,
} from './connection-capability-matrix.ts'

const ready = {
	runtimeBundled: true,
	engineAdapterAvailable: true,
	buildEnabled: true,
	architectureSupported: true,
} as const

describe('connectionCapability', () => {
	it.each([
		['android', 'sing-box', 'vpn'],
		['ios', 'xray', 'vpn'],
		['macos', 'sing-box', 'vpn'],
		['linux', 'xray', 'vpn'],
		['windows', 'sing-box', 'vpn'],
		['macos', 'xray', 'proxy'],
		['linux', 'sing-box', 'proxy'],
		['windows', 'xray', 'proxy'],
		['cli', 'sing-box', 'proxy'],
	] as const)(
		'allows the structural %s/%s/%s cell',
		(platform, engineId, mode) => {
			expect(
				connectionCapability({
					platform,
					engineId,
					mode,
					...ready,
					nativeProviderAvailable: mode === 'vpn',
					systemProxyAvailable: mode === 'proxy' && platform !== 'cli',
					permissionGranted: true,
				}).status,
			).toBe('available')
		},
	)

	it.each([
		['android', 'proxy'],
		['ios', 'proxy'],
		['cli', 'vpn'],
	] as const)(
		'fails closed for structurally unsupported %s/%s',
		(platform, mode) => {
			const result = connectionCapability({
				platform,
				engineId: 'sing-box',
				mode,
				...ready,
				nativeProviderAvailable: true,
				systemProxyAvailable: true,
				permissionGranted: true,
			})

			expect(result.status).toBe('unsupported')
			expect(result.reason).toBe('unsupported-platform-mode')
		},
	)

	it('keeps Android Xray TUN unavailable until its packaged adapter is verified', () => {
		expect(
			connectionCapability({
				platform: 'android',
				engineId: 'xray',
				mode: 'vpn',
				...ready,
				nativeProviderAvailable: true,
				permissionGranted: true,
			}).reason,
		).toBe('adapter-unverified')
	})

	it.each([
		['runtimeBundled', 'missing-runtime'],
		['engineAdapterAvailable', 'missing-engine-adapter'],
		['buildEnabled', 'disabled-build-capability'],
		['architectureSupported', 'unsupported-architecture'],
		['nativeProviderAvailable', 'missing-native-provider'],
		['permissionGranted', 'permission-required'],
	] as const)(
		'reports %s failures without substituting proxy mode',
		(field, reason) => {
			const result = connectionCapability({
				platform: 'linux',
				engineId: 'sing-box',
				mode: 'vpn',
				...ready,
				nativeProviderAvailable: true,
				permissionGranted: true,
				[field]: false,
			})

			expect(result).toMatchObject({
				status: 'temporarily-unavailable',
				reason,
			})
		},
	)

	it('generates choices and hides structurally impossible modes', () => {
		const choices = connectionModeChoices({
			platform: 'android',
			engineId: 'sing-box',
			...ready,
			nativeProviderAvailable: true,
			permissionGranted: true,
			systemProxyAvailable: false,
		})

		expect(choices).toEqual([
			expect.objectContaining({ mode: 'vpn', status: 'available' }),
		])
	})
})
