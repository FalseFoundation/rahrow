import { describe, expect, it } from 'vitest'

import { ProfileError } from '../errors.ts'
import {
	DefaultSubscriptionParser,
	decodeSubscriptionLines,
	fetchSubscription,
	isHttpSubscriptionUrl,
	parseImportedProfiles,
	parseImportedProfilesWithReport,
	parseSubscriptionMetadata,
	parseSubscriptionMetadataValue,
	parseSubscriptionUserInfo,
	refreshSubscription,
} from './subscription-import.ts'

describe('parseImportedProfiles', () => {
	it('parses direct URLs through the shared protocol registry', () => {
		const [profile] = parseImportedProfiles({
			value:
				'vless://11111111-1111-4111-8111-111111111111@example.com:443?security=tls#Manual',
			source: 'manual',
		})

		expect(profile).toMatchObject({
			protocol: 'vless',
			metadata: {
				name: 'Manual',
				source: 'manual',
			},
		})
	})

	it('parses base64 subscription bodies with CRLF and comments', () => {
		const subscription = [
			'# ignored',
			'vless://11111111-1111-4111-8111-111111111111@example.com:443?security=tls#One',
			'trojan://secret@example.net:8443?security=tls#Two',
		].join('\r\n')
		const profiles = parseImportedProfiles({
			value: globalThis.btoa(subscription),
			source: 'subscription',
		})

		expect(profiles).toHaveLength(2)
		expect(profiles.map((profile) => profile.protocol)).toEqual([
			'vless',
			'trojan',
		])
		expect(
			profiles.every((profile) => profile.metadata?.source === 'subscription'),
		).toBe(true)
	})

	it('imports Shadowsocks entries through the shared subscription pipeline', () => {
		const [profile] = parseImportedProfiles({
			value: 'ss://YWVzLTEyOC1nY206c2VjcmV0@example.com:8388#Subscription%20SS',
			source: 'subscription',
		})

		expect(profile).toMatchObject({
			protocol: 'shadowsocks',
			authentication: { method: 'aes-128-gcm', password: 'secret' },
			metadata: { source: 'subscription' },
		})
	})

	it('returns no profiles for empty subscription input', () => {
		expect(
			parseImportedProfiles({ value: '   ', source: 'subscription' }),
		).toEqual([])
		expect(decodeSubscriptionLines('')).toEqual([])
	})

	it('fails safely when a detected subscription entry is malformed', () => {
		expect(() =>
			parseImportedProfiles({
				value: 'vless://id@example.com:70000',
				source: 'subscription',
			}),
		).toThrow(ProfileError)
	})

	it('keeps valid subscription profiles while reporting malformed entries', () => {
		const result = parseImportedProfilesWithReport({
			value: [
				'vless://11111111-1111-4111-8111-111111111111@example.com:443?security=tls#One',
				'vless://not-a-uuid@example.com:443',
				'trojan://secret@example.net:8443?security=tls#Two',
			].join('\n'),
			source: 'subscription',
		})

		expect(result.profiles.map((profile) => profile.metadata?.name)).toEqual([
			'One',
			'Two',
		])
		expect(result.issues).toEqual([
			expect.objectContaining({
				index: 1,
				source: 'subscription',
				value: 'vless://[redacted]@example.com:443',
				message: expect.stringContaining('authentication.id'),
			}),
		])
	})

	it('rejects REALITY subscription entries without a public key', () => {
		const result = parseImportedProfilesWithReport({
			value:
				'trojan://secret@example.net:443?security=reality&sni=example.net#MissingKey',
			source: 'subscription',
		})

		expect(result.profiles).toEqual([])
		expect(result.issues).toEqual([
			expect.objectContaining({
				kind: 'invalid',
				message: 'REALITY security is missing a public key',
			}),
		])
	})

	it('handles manual clipboard share and QR sources through the same pipeline', () => {
		for (const source of ['manual', 'clipboard', 'share', 'qr'] as const) {
			const [profile] = parseImportedProfiles({
				value:
					'vless://11111111-1111-4111-8111-111111111111@example.com:443?security=tls#Imported',
				source,
			})

			expect(profile?.metadata?.source).toBe(source)
		}
	})

	it('decodes base64url subscription bodies through the same import pipeline', () => {
		const raw =
			'vless://11111111-1111-4111-8111-111111111111@example.com:443?security=tls#Base64Url'
		const payload = globalThis
			.btoa(raw)
			.replaceAll('+', '-')
			.replaceAll('/', '_')
			.replace(/=+$/u, '')
		const [profile] = parseImportedProfiles({
			value: payload,
			source: 'subscription',
		})

		expect(profile?.metadata).toMatchObject({
			name: 'Base64Url',
			source: 'subscription',
		})
	})

	it('treats a pasted https subscription URL as a remote fetch, not a share link', () => {
		expect(
			isHttpSubscriptionUrl(
				'https://sub.example.com/api/v1/client/subscribe?token=abc',
			),
		).toBe(true)
		expect(isHttpSubscriptionUrl('trojan://secret@example.com:443')).toBe(false)
		expect(
			parseImportedProfilesWithReport({
				value: 'https://sub.example.com/api/v1/client/subscribe?token=abc',
				source: 'manual',
			}).profiles,
		).toEqual([])
	})

	it('rejects plaintext remote subscriptions and redacts credentials in diagnostics', () => {
		expect(isHttpSubscriptionUrl('http://sub.example.com/list')).toBe(false)
		const result = parseImportedProfilesWithReport({
			value: 'trojan://super-secret@example.com:70000',
			source: 'subscription',
		})

		expect(result.issues[0]?.value).toBe('trojan://[redacted]@example.com:70000')
		expect(JSON.stringify(result)).not.toContain('super-secret')
		const vmess = parseImportedProfilesWithReport({
			value: 'vmess://eyJwcyI6InNlY3JldCIsImFkZCI6ImJhZCJ9',
			source: 'subscription',
		})
		expect(vmess.issues[0]?.value).toBe('vmess://[redacted]')
		expect(JSON.stringify(vmess)).not.toContain('eyJwcyI6')
	})

	it('reports unsupported non-empty import lines without blocking valid profiles', () => {
		const result = parseImportedProfilesWithReport({
			value: [
				'not a profile',
				'trojan://secret@example.net:8443?security=tls#Valid',
			].join('\n'),
			source: 'manual',
		})

		expect(result.profiles).toHaveLength(1)
		expect(result.issues).toEqual([
			expect.objectContaining({
				index: 0,
				message: 'Unsupported connection URL',
			}),
		])
	})
})

describe('fetchSubscription', () => {
	it('uses injected fetching and parser ports', async () => {
		const profiles = await fetchSubscription(
			{
				id: 'sub-1',
				name: 'Primary',
				url: 'https://subscriptions.example/list',
			},
			{
				async fetch() {
					return 'trojan://secret@example.net:8443?security=tls#Fetched'
				},
			},
			new DefaultSubscriptionParser(),
		)

		expect(profiles).toHaveLength(1)
		expect(profiles[0]?.metadata?.source).toBe('subscription')
	})
})

describe('refreshSubscription', () => {
	it('parses and persists de-facto subscription usage metadata', async () => {
		expect(
			parseSubscriptionUserInfo(
				'upload=1024; download=2048; total=8192; expire=1789327611; ignored=1',
			),
		).toEqual({
			uploadBytes: 1024,
			downloadBytes: 2048,
			totalBytes: 8192,
			expiresAt: '2026-09-13T19:26:51.000Z',
		})
		expect(parseSubscriptionUserInfo('upload=-1; total=NaN')).toBeUndefined()
		expect(parseSubscriptionUserInfo('expire=9007199254740991')).toBeUndefined()
	})

	it('keeps metadata from the same successful subscription fetch', async () => {
		const result = await refreshSubscription(
			{ id: 'sub-1', url: 'https://subscriptions.example/list' },
			{
				async fetch() {
					throw new Error('fetchWithMetadata should be preferred')
				},
				async fetchWithMetadata() {
					return {
						body: 'trojan://secret@example.net:8443?security=tls#One',
						metadata: { usage: { totalBytes: 10_000, downloadBytes: 2_000 } },
					}
				},
			},
		)

		expect(result.subscription.metadata?.usage).toEqual({
			totalBytes: 10_000,
			downloadBytes: 2_000,
		})
	})

	it('allowlists and validates metadata supplied by fetch ports', async () => {
		expect(
			parseSubscriptionMetadataValue({
				usage: {
					downloadBytes: 100,
					totalBytes: Number.MAX_SAFE_INTEGER + 1,
					expiresAt: 'not-a-date',
				},
				supportUrl: 'https://user:secret@support.example/help',
				profileUrl: 'https://provider.example/account',
				alternateProfileUrl: 'https://provider.example/account?token=secret',
				credential: 'Bearer secret',
			}),
		).toEqual({
			usage: { downloadBytes: 100 },
			profileUrl: 'https://provider.example/account',
		})

		const headers = new Headers({
			'Subscription-Userinfo': 'upload=; download=200; unknown=secret',
			'Support-Url': 'javascript:alert(1)',
			'Profile-Web-Page-Url': 'https://provider.example/account',
			Authorization: 'Bearer secret',
		})
		expect(parseSubscriptionMetadata(headers)).toEqual({
			usage: { downloadBytes: 200 },
			profileUrl: 'https://provider.example/account',
		})
		expect(JSON.stringify(parseSubscriptionMetadata(headers))).not.toContain(
			'secret',
		)
		expect(
			parseSubscriptionMetadataValue({
				profileUrl: 'https://provider.example/account?access_token=secret',
			}),
		).toBeUndefined()
	})

	it('clears a previous metadata snapshot when a refresh supplies none', async () => {
		const result = await refreshSubscription(
			{
				id: 'sub-1',
				url: 'https://subscriptions.example/list',
				metadata: { usage: { totalBytes: 10_000 } },
			},
			{
				async fetch() {
					return 'trojan://secret@example.net:8443?security=tls#One'
				},
			},
		)

		expect(result.subscription.metadata).toBeUndefined()
	})

	it('refreshes mixed-protocol subscriptions and reports garbage without failing the batch', async () => {
		const vmess = `vmess://${globalThis.btoa(
			JSON.stringify({
				add: 'vmess.example.com',
				id: '22222222-2222-4222-8222-222222222222',
				net: 'tcp',
				port: '443',
				ps: 'VMess',
				v: '2',
			}),
		)}`
		const result = await refreshSubscription(
			{
				id: 'sub-1',
				name: 'Primary',
				url: 'https://subscriptions.example/list',
			},
			{
				async fetch() {
					return [
						'vless://11111111-1111-4111-8111-111111111111@example.com:443?security=tls#One',
						'!!! garbage !!!',
						vmess,
						'trojan://secret@example.net:8443?security=tls#Two',
					].join('\n')
				},
			},
			{
				now() {
					return '2026-01-01T00:00:00.000Z'
				},
			},
		)

		expect(result.profiles.map((profile) => profile.protocol)).toEqual([
			'vless',
			'vmess',
			'trojan',
		])
		expect(result.issues).toEqual([
			expect.objectContaining({
				index: 1,
				value: '!!! garbage !!!',
			}),
		])
		expect(result.subscription).toMatchObject({
			id: 'sub-1',
			updatedAt: '2026-01-01T00:00:00.000Z',
		})
	})

	it('awaits an injected report parser before applying subscription ownership', async () => {
		let parsed = false
		const result = await refreshSubscription(
			{ id: 'sub-1', url: 'https://subscriptions.example/list' },
			{
				async fetch() {
					return 'paced input'
				},
			},
			undefined,
			undefined,
			{
				async parse(input) {
					await Promise.resolve()
					parsed = true
					expect(input).toEqual({ value: 'paced input', source: 'subscription' })
					return {
						profiles: [
							{
								id: 'paced',
								protocol: 'vmess',
								endpoint: { host: 'paced.example', port: 443 },
							},
						],
						issues: [],
					}
				},
			},
		)

		expect(parsed).toBe(true)
		expect(result.profiles[0]?.metadata).toMatchObject({
			subscriptionId: 'sub-1',
		})
	})
})
