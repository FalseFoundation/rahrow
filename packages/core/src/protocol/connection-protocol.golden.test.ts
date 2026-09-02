import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { ProfileError } from '../errors.ts'
import { parseConnectionProfile } from '../profile/profile-schema.ts'
import {
	parseConnectionUrl,
	serializeConnectionProfile,
} from './connection-protocol.ts'

const goldenDirectory = join(dirname(fileURLToPath(import.meta.url)), 'goldens')

function readGolden(name: string) {
	return JSON.parse(readFileSync(join(goldenDirectory, name), 'utf8')) as unknown
}

function withGeneratedId(profile: unknown, id: string) {
	if (!profile || typeof profile !== 'object') {
		throw new Error('Golden profile must be an object')
	}

	return { ...profile, id }
}

function vmessUrl(payload: Record<string, unknown>) {
	return `vmess://${globalThis.btoa(JSON.stringify(payload))}`
}

const validUuid = '11111111-1111-4111-8111-111111111111'
const vmessUuid = '22222222-2222-4222-8222-222222222222'

const shareLinks = [
	{
		name: 'vless-ws-tls.json',
		url: `vless://${validUuid}@example.com:443?type=ws&security=tls&sni=edge.example.com&path=%2Fws#Primary`,
	},
	{
		name: 'vless-reality-grpc.json',
		url: `vless://${validUuid}@example.com:443?type=grpc&serviceName=edge&security=reality&sni=server.example.com&fp=chrome&pbk=public-key&sid=abcd&flow=xtls-rprx-vision#Reality`,
	},
	{
		name: 'vless-httpupgrade-tls.json',
		url: `vless://${validUuid}@example.com:443?type=httpupgrade&security=tls&sni=edge.example.com&host=cdn.example.com&path=%2Fupgrade&alpn=h2,http/1.1&allowInsecure=1&mux=1&packetEncoding=xudp&encryption=none#Upgrade`,
	},
	{
		name: 'vless-reality-tcp-http.json',
		url: `vless://${validUuid}@example.com:443?type=tcp&headerType=http&security=reality&sni=www.example.com&fp=chrome&pbk=public-key&sid=abcd&spx=%2Fspider#Reality`,
	},
	{
		name: 'trojan-tls.json',
		url: 'trojan://secret@example.net:8443?security=tls&sni=tls.example.net#Trojan',
	},
	{
		name: 'vmess-ws-tls.json',
		url: vmessUrl({
			add: 'vmess.example.com',
			aid: '0',
			host: 'cdn.example.com',
			id: vmessUuid,
			net: 'ws',
			path: '/ray',
			port: '443',
			ps: 'VMess',
			sni: 'vmess.example.com',
			tls: 'tls',
			v: '2',
		}),
	},
	{
		name: 'vmess-tcp-http.json',
		url: vmessUrl({
			add: 'vmess.example.com',
			alpn: 'h2,http/1.1',
			allowInsecure: '1',
			id: vmessUuid,
			net: 'tcp',
			port: '443',
			ps: 'VMess TCP',
			scy: 'zero',
			sni: 'vmess.example.com',
			tls: 'tls',
			type: 'http',
			v: '2',
		}),
	},
] as const

describe('share-link golden profiles', () => {
	it.each(shareLinks)(
		'parses $name into a frozen profile snapshot',
		({ name, url }) => {
			const [profile] = parseConnectionUrl(url)

			expect(profile.id).toMatch(/^[A-Za-z0-9_.:-]+$/u)
			expect(profile).toEqual(withGeneratedId(readGolden(name), profile.id))
		},
	)

	it.each(shareLinks)(
		'round-trips $name through serialize then parse',
		({ name, url }) => {
			const [profile] = parseConnectionUrl(url)
			const [roundTrip] = parseConnectionUrl(serializeConnectionProfile(profile))

			expect(roundTrip).toEqual(withGeneratedId(readGolden(name), roundTrip.id))
			expect(roundTrip).toEqual({ ...profile, id: roundTrip.id })
			expect(roundTrip.id).not.toBe(profile.id)
		},
	)

	it('parses numeric VMess ports used by common share-link exporters', () => {
		const [profile] = parseConnectionUrl(
			vmessUrl({
				add: 'vmess.example.com',
				id: vmessUuid,
				net: 'tcp',
				port: 443,
				ps: 'Numeric port',
				v: '2',
			}),
		)

		expect(profile.endpoint).toEqual({
			host: 'vmess.example.com',
			port: 443,
		})
		expect(profile.metadata).toMatchObject({
			name: 'Numeric port',
			source: 'url',
		})
	})

	it('ignores unknown VLESS query params without leaking them onto the profile', () => {
		const [profile] = parseConnectionUrl(
			`vless://${validUuid}@example.com:443?security=none&unknown=value&fragment=tlshello#Direct`,
		)

		expect(profile).toEqual({
			id: profile.id,
			protocol: 'vless',
			endpoint: {
				host: 'example.com',
				port: 443,
			},
			authentication: {
				id: validUuid,
			},
			metadata: {
				name: 'Direct',
				source: 'url',
			},
		})
		expect(profile.id).toMatch(/^vless:example\.com:443\.[a-f0-9-]+$/u)
		expect(profile).not.toHaveProperty('unknown')
		expect(profile).not.toHaveProperty('fragment')
	})
})

describe('malformed and hostile share-link input', () => {
	it.each([
		['unsupported scheme', 'https://example.com'],
		['shadowsocks URL', 'ss://secret@example.com:443'],
		['empty input', '   '],
		['VLESS without a user id', `vless://example.com:443`],
		['invalid UUID', `vless://not-a-uuid@example.com:443`],
		[
			'truncated UUID',
			`vless://11111111-1111-4111-8111-11111111111@example.com:443`,
		],
		['missing port', `vless://${validUuid}@example.com`],
		['port 0', `vless://${validUuid}@example.com:0`],
		['port 65536', `vless://${validUuid}@example.com:65536`],
		['non-integer port', `vless://${validUuid}@example.com:443.5`],
		['unsupported transport', `vless://${validUuid}@example.com:443?type=kcp`],
		[
			'unsupported security',
			`vless://${validUuid}@example.com:443?security=xtls`,
		],
		[
			'unsupported header type',
			`vless://${validUuid}@example.com:443?type=tcp&headerType=wechat`,
		],
		[
			'unsupported packet encoding',
			`vless://${validUuid}@example.com:443?type=tcp&packetEncoding=kcp`,
		],
		[
			'invalid boolean',
			`vless://${validUuid}@example.com:443?allowInsecure=maybe`,
		],
		['malformed VMess base64', 'vmess://not-base64'],
		['VMess JSON that is not JSON', `vmess://${globalThis.btoa('not json')}`],
		['VMess JSON array', `vmess://${globalThis.btoa('[]')}`],
		['VMess JSON null', `vmess://${globalThis.btoa('null')}`],
		['VMess missing host', vmessUrl({ id: vmessUuid, port: '443' })],
		[
			'VMess invalid UUID',
			vmessUrl({ add: 'vmess.example.com', id: 'not-a-uuid', port: '443' }),
		],
		[
			'VMess invalid port',
			vmessUrl({ add: 'vmess.example.com', id: vmessUuid, port: '70000' }),
		],
		['Trojan missing password', 'trojan://@example.com:443'],
		['Trojan missing port', 'trojan://secret@example.com'],
		['Trojan invalid port', 'trojan://secret@example.com:70000'],
	])('fails closed for %s', (_name, input) => {
		expect(() => parseConnectionUrl(input)).toThrow(ProfileError)
	})

	it('fails closed for extra unknown VMess fields that look like engine config', () => {
		expect(() =>
			parseConnectionUrl(
				vmessUrl({
					add: 'vmess.example.com',
					id: vmessUuid,
					outbounds: [{ protocol: 'freedom' }],
					port: '443',
					streamSettings: { security: 'none' },
					v: '2',
				}),
			),
		).toThrow(ProfileError)
	})

	it('fails closed for prototype-polluting VMess keys', () => {
		expect(() =>
			parseConnectionUrl(
				`vmess://${globalThis.btoa(
					`{"add":"vmess.example.com","id":"${vmessUuid}","port":"443","__proto__":{"polluted":true}}`,
				)}`,
			),
		).toThrow(ProfileError)
		expect(() =>
			parseConnectionUrl(
				vmessUrl({
					add: 'vmess.example.com',
					constructor: { polluted: true },
					id: vmessUuid,
					port: '443',
				}),
			),
		).toThrow(ProfileError)
	})

	it('fails closed for extra unknown fields on persisted profile JSON', () => {
		expect(() =>
			parseConnectionProfile({
				id: 'profile-1',
				protocol: 'vless',
				endpoint: {
					host: 'example.com',
					port: 443,
				},
				outbounds: [{ protocol: 'freedom' }],
			}),
		).toThrow(ProfileError)
	})
})
