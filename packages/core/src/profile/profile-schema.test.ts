import { describe, expect, it } from 'vitest'

import { ProfileError } from '../errors.ts'
import { parseConnectionProfile, parseSettings } from './profile-schema.ts'

describe('parseConnectionProfile', () => {
	it('accepts a minimal VLESS profile', () => {
		const profile = parseConnectionProfile({
			id: 'profile-1',
			protocol: 'vless',
			endpoint: {
				host: 'example.com',
				port: 443,
			},
		})

		expect(profile.protocol).toBe('vless')
		expect(profile.endpoint.port).toBe(443)
	})

	it('accepts only modern Shadowsocks methods with explicit credentials', () => {
		const profile = parseConnectionProfile({
			id: 'profile-ss',
			protocol: 'shadowsocks',
			endpoint: { host: 'example.com', port: 8388 },
			authentication: { method: 'chacha20-ietf-poly1305', password: 'secret' },
		})

		expect(profile.authentication).toEqual({
			method: 'chacha20-ietf-poly1305',
			password: 'secret',
		})
		expect(() =>
			parseConnectionProfile({
				...profile,
				authentication: { method: 'aes-256-cfb', password: 'secret' },
			}),
		).toThrow(ProfileError)
	})

	it('rejects unsupported protocols', () => {
		expect(() =>
			parseConnectionProfile({
				id: 'profile-1',
				protocol: 'wireguard',
				endpoint: {
					host: 'example.com',
					port: 443,
				},
			}),
		).toThrow(ProfileError)
	})

	it('rejects invalid endpoint ports', () => {
		expect(() =>
			parseConnectionProfile({
				id: 'profile-1',
				protocol: 'trojan',
				endpoint: {
					host: 'example.com',
					port: 70000,
				},
			}),
		).toThrow(ProfileError)
	})

	it('rejects hostile or malformed profile object shapes with a stable error code', () => {
		expect(() =>
			parseConnectionProfile({
				id: 'profile-1',
				protocol: 'vless',
				endpoint: {
					host: 'example.com',
					port: 443,
				},
				__proto__: {
					polluted: true,
				},
			}),
		).toThrow(
			expect.objectContaining({
				code: 'invalid_profile',
			}),
		)
	})

	it('rejects empty or control-character endpoint fields', () => {
		expect(() =>
			parseConnectionProfile({
				id: 'profile-1',
				protocol: 'vless',
				endpoint: {
					host: 'exa\nmple.com',
					port: 443,
				},
			}),
		).toThrow(ProfileError)
	})

	it('accepts production share-link fields used by VLESS, VMess, and Trojan', () => {
		const profile = parseConnectionProfile({
			id: 'profile-1',
			protocol: 'vless',
			endpoint: {
				host: 'example.com',
				port: 443,
			},
			transport: {
				type: 'ws',
				host: 'cdn.example.com',
				path: '/ray',
				headerType: 'http',
				mux: true,
				packetEncoding: 'xudp',
			},
			security: {
				type: 'reality',
				serverName: 'www.example.com',
				fingerprint: 'chrome',
				publicKey: 'public-key',
				shortId: 'abcd',
				spiderX: '/',
				alpn: ['h2', 'http/1.1'],
				allowInsecure: false,
			},
			authentication: {
				id: '11111111-1111-4111-8111-111111111111',
				flow: 'xtls-rprx-vision',
				encryption: 'none',
			},
		})

		expect(profile.transport).toMatchObject({
			type: 'ws',
			headerType: 'http',
			mux: true,
			packetEncoding: 'xudp',
		})
		expect(profile.security).toMatchObject({
			spiderX: '/',
			alpn: ['h2', 'http/1.1'],
			allowInsecure: false,
		})
		expect(profile.authentication?.encryption).toBe('none')
	})

	it('rejects extra unknown fields on the profile and nested objects', () => {
		const baseProfile = {
			id: 'profile-1',
			protocol: 'vless',
			endpoint: {
				host: 'example.com',
				port: 443,
			},
		}

		for (const profile of [
			{
				...baseProfile,
				unknown: true,
			},
			{
				...baseProfile,
				endpoint: {
					host: 'example.com',
					port: 443,
					extra: true,
				},
			},
			{
				...baseProfile,
				transport: {
					type: 'ws',
					path: '/ray',
					headers: { Host: 'cdn.example.com' },
				},
			},
			{
				...baseProfile,
				security: {
					type: 'tls',
					serverName: 'example.com',
					disableSystemRoot: true,
				},
			},
		]) {
			expect(() => parseConnectionProfile(profile)).toThrow(ProfileError)
		}
	})

	it('rejects missing required profile fields', () => {
		expect(() =>
			parseConnectionProfile({
				protocol: 'vless',
				endpoint: {
					host: 'example.com',
					port: 443,
				},
			}),
		).toThrow(ProfileError)
		expect(() =>
			parseConnectionProfile({
				id: 'profile-1',
				protocol: 'vless',
			}),
		).toThrow(ProfileError)
	})

	it('rejects malformed transport security authentication and metadata fields', () => {
		const baseProfile = {
			id: 'profile-1',
			protocol: 'trojan',
			endpoint: {
				host: 'example.com',
				port: 443,
			},
		}

		for (const profile of [
			{
				...baseProfile,
				transport: {
					type: 'ws',
					path: '',
				},
			},
			{
				...baseProfile,
				transport: {
					type: 'tcp',
					headerType: 'wechat',
				},
			},
			{
				...baseProfile,
				transport: {
					type: 'ws',
					packetEncoding: 'kcp',
				},
			},
			{
				...baseProfile,
				security: {
					type: 'reality',
					publicKey: ' ',
				},
			},
			{
				...baseProfile,
				security: {
					type: 'tls',
					alpn: ['h2', ''],
				},
			},
			{
				...baseProfile,
				security: {
					type: 'reality',
					spiderX: '\n',
				},
			},
			{
				...baseProfile,
				authentication: {
					password: '',
				},
			},
			{
				...baseProfile,
				authentication: {
					encryption: '',
				},
			},
			{
				...baseProfile,
				metadata: {
					name: '',
				},
			},
			{
				...baseProfile,
				metadata: {
					tags: ['stable', ''],
				},
			},
		]) {
			expect(() => parseConnectionProfile(profile)).toThrow(ProfileError)
		}
	})
})

describe('parseSettings', () => {
	it('accepts valid local settings', () => {
		expect(
			parseSettings({
				activeProfileId: 'profile-1',
				engineId: 'xray',
				localPort: 10808,
			}),
		).toEqual({
			activeProfileId: 'profile-1',
			engineId: 'xray',
			localPort: 10808,
			connectionMode: 'vpn',
		})
	})

	it('defaults new settings to sing-box over VPN and rejects removed settings', () => {
		expect(parseSettings({})).toEqual({
			engineId: 'sing-box',
			connectionMode: 'vpn',
		})
		expect(() => parseSettings({ systemProxy: false })).toThrow(ProfileError)
		expect(() => parseSettings({ systemProxy: true })).toThrow(ProfileError)
	})

	it('accepts an explicit proxy fallback mode', () => {
		expect(parseSettings({ connectionMode: 'proxy' })).toEqual({
			engineId: 'sing-box',
			connectionMode: 'proxy',
		})
	})

	it('accepts sing-box and rejects unknown persisted engine selections', () => {
		expect(parseSettings({ engineId: 'sing-box' })).toEqual({
			engineId: 'sing-box',
			connectionMode: 'vpn',
		})
		expect(() => parseSettings({ engineId: 'unknown-engine' })).toThrow(
			ProfileError,
		)
	})

	it('rejects invalid settings with stable typed errors', () => {
		expect(() =>
			parseSettings({
				activeProfileId: '',
				engineId: 'xray',
				localPort: 70000,
			}),
		).toThrow(
			expect.objectContaining({
				code: 'invalid_profile',
			}),
		)
	})

	it('rejects hostile settings object shapes', () => {
		expect(() =>
			parseSettings({
				engineId: 'xray',
				unknown: true,
			}),
		).toThrow(ProfileError)
	})

	it('accepts routing, language, theme, connection mode, and start-on-login settings', () => {
		expect(
			parseSettings({
				activeProfileId: 'profile-1',
				engineId: 'xray',
				localPort: 10808,
				routingMode: 'rule',
				language: 'fa',
				theme: 'dark',
				connectionMode: 'proxy',
				launchAtStartup: false,
			}),
		).toEqual({
			activeProfileId: 'profile-1',
			engineId: 'xray',
			localPort: 10808,
			routingMode: 'rule',
			language: 'fa',
			theme: 'dark',
			connectionMode: 'proxy',
			launchAtStartup: false,
		})
	})

	it('accepts bounded Connections viewport and latency snapshots', () => {
		expect(
			parseSettings({
				connectionsView: {
					version: 1,
					groupOpen: {},
					query: '',
					sort: 'default',
					scrollOffset: 912.5,
					loadedProfileCount: 750,
				},
				latencyResults: {
					'profile-1': {
						profileId: 'profile-1',
						reachable: true,
						latencyMs: 48,
						checkedAt: '2026-08-31T12:00:00.000Z',
					},
				},
			}),
		).toMatchObject({
			connectionsView: { scrollOffset: 912.5, loadedProfileCount: 750 },
			latencyResults: { 'profile-1': { latencyMs: 48 } },
		})
	})

	it('recovers an unsafe Connections viewport snapshot', () => {
		expect(
			parseSettings({
				connectionsView: {
					version: 1,
					groupOpen: {},
					query: '',
					sort: 'default',
					scrollOffset: -1,
				},
			}),
		).toMatchObject({ connectionsView: { recoveredFromInvalid: true } })
	})

	it('rejects unsafe persisted latency snapshots', () => {
		expect(() =>
			parseSettings({
				latencyResults: {
					'profile-1': {
						profileId: 'different-profile',
						reachable: true,
						latencyMs: Number.POSITIVE_INFINITY,
						checkedAt: 'not-a-date',
					},
				},
			}),
		).toThrow(ProfileError)
	})

	it('rejects invalid preference values in persisted settings', () => {
		expect(() =>
			parseSettings({
				routingMode: 'ads',
			}),
		).toThrow(ProfileError)
		expect(() =>
			parseSettings({
				theme: 'neon',
			}),
		).toThrow(ProfileError)
		expect(() =>
			parseSettings({
				language: '',
			}),
		).toThrow(ProfileError)
		expect(() =>
			parseSettings({
				systemProxy: 'yes',
			}),
		).toThrow(ProfileError)
	})
})
