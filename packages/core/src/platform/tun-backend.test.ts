import { describe, expect, it } from 'vitest'

import { defaultTunBackend, hevSocks5Tunnel } from './tun-backend.ts'

describe('defaultTunBackend', () => {
	it('selects HEV only for a compatible platform with a verified native adapter', () => {
		for (const platform of ['android', 'linux'] as const) {
			expect(
				defaultTunBackend({
					platform,
					hevRuntime: 'verified',
					nativeTunnel: true,
					socketBypass: true,
				}),
			).toEqual(hevSocks5Tunnel)
		}
	})

	it('fails closed to the existing native engine tunnel when any HEV gate is missing', () => {
		const unavailable = [
			{
				platform: 'android' as const,
				hevRuntime: 'missing' as const,
				nativeTunnel: true,
				socketBypass: true,
			},
			{
				platform: 'linux' as const,
				hevRuntime: 'verified' as const,
				nativeTunnel: false,
				socketBypass: true,
			},
			{
				platform: 'windows' as const,
				hevRuntime: 'verified' as const,
				nativeTunnel: true,
				socketBypass: false,
			},
			{
				platform: 'ios' as const,
				hevRuntime: 'verified' as const,
				nativeTunnel: true,
				socketBypass: true,
			},
		] as const

		for (const input of unavailable) {
			expect(defaultTunBackend(input)).toMatchObject({
				id: 'engine-native',
			})
		}
	})

	it('never runs HEV in proxy mode or a standalone CLI process', () => {
		for (const platform of ['proxy', 'cli'] as const) {
			expect(
				defaultTunBackend({
					platform,
					hevRuntime: 'verified',
					nativeTunnel: true,
					socketBypass: true,
				}),
			).toMatchObject({ id: 'engine-native' })
		}
	})
})
