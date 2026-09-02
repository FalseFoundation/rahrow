import { describe, expect, it, vi } from 'vitest'

import { ProfileError } from '../errors.ts'
import {
	parseConnectionUrl,
	serializeConnectionProfile,
} from './connection-protocol.ts'

function vmessUrl(payload: Record<string, unknown>) {
	return `vmess://${globalThis.btoa(JSON.stringify(payload))}`
}

describe('protocol URL parsing', () => {
	it('generates distinct IPC-safe IDs without embedding credentials', () => {
		const vmessCredential = '22222222-2222-4222-8222-222222222222'
		const values = [
			'vless://11111111-1111-4111-8111-111111111111@example.com:443',
			'trojan://trojan-secret@example.com:443',
			'ss://YWVzLTI1Ni1nY206c3Mtc2VjcmV0@example.com:8388',
			'hysteria://hy.example.com:443?auth=hysteria-secret&upmbps=50&downmbps=100',
			'hy2://hy2-secret@hy2.example.com:443',
			'ssh://alice:ssh-secret@ssh.example.com:22?hostKey=ssh-ed25519%20AAAA-test',
			vmessUrl({
				add: 'vmess.example.com',
				id: vmessCredential,
				net: 'tcp',
				port: '443',
				v: '2',
			}),
		]
		const forbidden = [
			'11111111-1111-4111-8111-111111111111',
			'trojan-secret',
			'ss-secret',
			'hysteria-secret',
			'hy2-secret',
			'alice',
			'ssh-secret',
			vmessCredential,
		]

		const ids = values.map((value) => parseConnectionUrl(value)[0]?.id)

		expect(new Set(ids)).toHaveLength(values.length)
		for (const id of ids) {
			expect(id).toMatch(/^[A-Za-z0-9_.:-]+$/u)
			for (const secret of forbidden) {
				expect(id).not.toContain(secret)
			}
		}
		expect(parseConnectionUrl(values[0] ?? '')[0]?.id).not.toBe(ids[0])
	})

	it('does not turn imported credentials into a stable ID verifier', () => {
		const randomUuid = '00000000-0000-4000-8000-000000000000'
		const uuidSpy = vi
			.spyOn(globalThis.crypto, 'randomUUID')
			.mockReturnValue(randomUuid)

		try {
			const [firstTrojan] = parseConnectionUrl(
				'trojan://first-secret@example.com:443',
			)
			const [secondTrojan] = parseConnectionUrl(
				'trojan://second-secret@example.com:443',
			)

			expect(firstTrojan?.id).toBe(`trojan:example.com:443.${randomUuid}`)
			expect(secondTrojan?.id).toBe(firstTrojan?.id)
		} finally {
			uuidSpy.mockRestore()
		}
	})

	it('round-trips Hysteria and Hysteria2 share URLs', () => {
		for (const value of [
			'hysteria://hy.example.com:443?auth=secret&upmbps=50&downmbps=100&peer=hy.example.com#Hysteria',
			'hy2://secret@hy2.example.com:8443?sni=hy2.example.com#Hysteria%202',
		]) {
			const [profile] = parseConnectionUrl(value)

			expect(profile?.protocol).toMatch(/^hysteria2?$/u)
			if (!profile) throw new Error('Expected a Hysteria profile')
			expect(serializeConnectionProfile(profile)).toBe(value)
		}
	})

	it('requires a pinned host key for SSH and round-trips password profiles', () => {
		const value =
			'ssh://alice:secret@ssh.example.com:22?hostKey=ssh-ed25519%20AAAA-test#SSH'
		const [profile] = parseConnectionUrl(value)

		expect(profile).toMatchObject({
			protocol: 'ssh',
			authentication: {
				username: 'alice',
				password: 'secret',
				hostKey: 'ssh-ed25519 AAAA-test',
			},
		})
		if (!profile) throw new Error('Expected an SSH profile')
		expect(serializeConnectionProfile(profile)).toBe(value)
		expect(() =>
			parseConnectionUrl('ssh://alice:secret@ssh.example.com:22'),
		).toThrow('host key')
	})

	it('round-trips modern Shadowsocks SIP002 URLs without changing the cipher', () => {
		const [profile] = parseConnectionUrl(
			'ss://YWVzLTI1Ni1nY206c2VjcmV0@example.com:8388#Primary%20SS',
		)

		expect(profile).toMatchObject({
			protocol: 'shadowsocks',
			endpoint: { host: 'example.com', port: 8388 },
			authentication: {
				method: 'aes-256-gcm',
				password: 'secret',
			},
			metadata: { name: 'Primary SS', source: 'url' },
		})
		if (!profile) throw new Error('Expected a Shadowsocks profile')
		expect(serializeConnectionProfile(profile)).toBe(
			'ss://YWVzLTI1Ni1nY206c2VjcmV0@example.com:8388#Primary%20SS',
		)
	})

	it('parses and serializes AEAD-2022 credentials as plain percent-encoded userinfo', () => {
		const [profile] = parseConnectionUrl(
			'ss://2022-blake3-aes-256-gcm:YctPZ6U7xPPcU%2Bgp3u%2B0tx%2FtRizJN9K8y%2BuKlW2qjlI%3D@example.com:8388#AEAD%202022',
		)

		expect(profile?.authentication).toEqual({
			method: '2022-blake3-aes-256-gcm',
			password: 'YctPZ6U7xPPcU+gp3u+0tx/tRizJN9K8y+uKlW2qjlI=',
		})
		if (!profile) throw new Error('Expected an AEAD-2022 profile')
		expect(serializeConnectionProfile(profile)).toBe(
			'ss://2022-blake3-aes-256-gcm:YctPZ6U7xPPcU%2Bgp3u%2B0tx%2FtRizJN9K8y%2BuKlW2qjlI%3D@example.com:8388#AEAD%202022',
		)
	})

	it('rejects legacy, unknown, and incorrectly encoded AEAD-2022 methods', () => {
		for (const value of [
			'ss://not-base64@example.com:8388',
			'ss://YWVzLTI1Ni1jZmI6c2VjcmV0@example.com:8388',
			'ss://bm90LWEtY2lwaGVyOnNlY3JldA@example.com:8388',
			'ss://MjAyMi1ibGFrZTMtYWVzLTI1Ni1nY206c2VjcmV0@example.com:8388',
		]) {
			expect(() => parseConnectionUrl(value)).toThrow(ProfileError)
		}
	})

	it('parses VLESS URLs into normalized profiles', () => {
		const [profile] = parseConnectionUrl(
			'vless://11111111-1111-4111-8111-111111111111@example.com:443?type=ws&security=tls&sni=edge.example.com&path=%2Fws#Primary',
		)

		expect(profile).toMatchObject({
			protocol: 'vless',
			endpoint: {
				host: 'example.com',
				port: 443,
			},
			transport: {
				type: 'ws',
				path: '/ws',
			},
			security: {
				type: 'tls',
				serverName: 'edge.example.com',
			},
			authentication: {
				id: '11111111-1111-4111-8111-111111111111',
			},
			metadata: {
				name: 'Primary',
				source: 'url',
			},
		})
	})

	it('parses Trojan URLs into normalized profiles', () => {
		const [profile] = parseConnectionUrl(
			'trojan://secret@example.net:8443?security=tls&sni=tls.example.net#Trojan',
		)

		expect(profile).toMatchObject({
			protocol: 'trojan',
			endpoint: {
				host: 'example.net',
				port: 8443,
			},
			security: {
				type: 'tls',
				serverName: 'tls.example.net',
			},
			authentication: {
				password: 'secret',
			},
		})
	})

	it('parses VMess URLs into normalized profiles', () => {
		const [profile] = parseConnectionUrl(
			vmessUrl({
				add: 'vmess.example.com',
				host: 'cdn.example.com',
				id: '22222222-2222-4222-8222-222222222222',
				net: 'ws',
				path: '/ray',
				port: '443',
				ps: 'VMess',
				sni: 'vmess.example.com',
				tls: 'tls',
				v: '2',
			}),
		)

		expect(profile).toMatchObject({
			protocol: 'vmess',
			endpoint: {
				host: 'vmess.example.com',
				port: 443,
			},
			transport: {
				type: 'ws',
				host: 'cdn.example.com',
				path: '/ray',
			},
			security: {
				type: 'tls',
				serverName: 'vmess.example.com',
			},
			metadata: {
				name: 'VMess',
				source: 'url',
			},
		})
	})

	it('parses TCP defaults and ignores unknown query params', () => {
		const [profile] = parseConnectionUrl(
			'vless://11111111-1111-4111-8111-111111111111@example.com:443?security=none&unknown=value#Direct',
		)

		expect(profile).toMatchObject({
			protocol: 'vless',
			endpoint: {
				host: 'example.com',
				port: 443,
			},
			authentication: {
				id: '11111111-1111-4111-8111-111111111111',
			},
			metadata: {
				name: 'Direct',
			},
		})
		expect(profile.transport).toBeUndefined()
		expect(profile.security).toBeUndefined()
	})

	it('parses VLESS REALITY and gRPC transport fields', () => {
		const [profile] = parseConnectionUrl(
			'vless://11111111-1111-4111-8111-111111111111@example.com:443?type=grpc&serviceName=edge&security=reality&sni=server.example.com&fp=chrome&pbk=public-key&sid=abcd&flow=xtls-rprx-vision#Reality',
		)

		expect(profile).toMatchObject({
			protocol: 'vless',
			transport: {
				type: 'grpc',
				serviceName: 'edge',
			},
			security: {
				type: 'reality',
				serverName: 'server.example.com',
				fingerprint: 'chrome',
				publicKey: 'public-key',
				shortId: 'abcd',
			},
			authentication: {
				id: '11111111-1111-4111-8111-111111111111',
				flow: 'xtls-rprx-vision',
			},
		})
	})

	it('parses VMess gRPC transport and TLS fields', () => {
		const [profile] = parseConnectionUrl(
			vmessUrl({
				add: 'vmess.example.com',
				fp: 'chrome',
				id: '22222222-2222-4222-8222-222222222222',
				net: 'grpc',
				path: 'edge',
				port: '443',
				ps: 'VMess gRPC',
				sni: 'vmess.example.com',
				tls: 'tls',
				v: '2',
			}),
		)

		expect(profile).toMatchObject({
			transport: {
				type: 'grpc',
				serviceName: 'edge',
			},
			security: {
				type: 'tls',
				fingerprint: 'chrome',
				serverName: 'vmess.example.com',
			},
		})
	})

	it('fails safely for malformed URLs and unsupported transports', () => {
		expect(() => parseConnectionUrl('https://example.com')).toThrow(ProfileError)
		expect(() =>
			parseConnectionUrl('vless://id@example.com:443?type=kcp'),
		).toThrow(ProfileError)
		expect(() => parseConnectionUrl('vmess://not-base64')).toThrow(ProfileError)
		expect(() => parseConnectionUrl('trojan://secret@example.com:70000')).toThrow(
			ProfileError,
		)
	})

	it('fails safely for missing fields and invalid UUIDs', () => {
		expect(() => parseConnectionUrl('vless://example.com:443')).toThrow(
			ProfileError,
		)
		expect(() =>
			parseConnectionUrl('vless://not-a-uuid@example.com:443'),
		).toThrow(ProfileError)
		expect(() => parseConnectionUrl('trojan://secret@example.com')).toThrow(
			ProfileError,
		)
		expect(() =>
			parseConnectionUrl(
				vmessUrl({
					id: '22222222-2222-4222-8222-222222222222',
					port: '443',
				}),
			),
		).toThrow(ProfileError)
		expect(() =>
			parseConnectionUrl(
				vmessUrl({
					add: 'vmess.example.com',
					id: 'not-a-uuid',
					port: '443',
				}),
			),
		).toThrow(ProfileError)
	})

	it('fails safely for malformed VMess JSON payloads', () => {
		expect(() =>
			parseConnectionUrl(`vmess://${globalThis.btoa('not json')}`),
		).toThrow(ProfileError)
	})

	it('parses HTTPUpgrade, ALPN, allowInsecure, mux, and packet encoding', () => {
		const [profile] = parseConnectionUrl(
			'vless://11111111-1111-4111-8111-111111111111@example.com:443?type=httpupgrade&security=tls&sni=edge.example.com&host=cdn.example.com&path=%2Fupgrade&alpn=h2,http/1.1&allowInsecure=1&mux=1&packetEncoding=xudp&encryption=none#Upgrade',
		)

		expect(profile).toMatchObject({
			transport: {
				type: 'httpupgrade',
				host: 'cdn.example.com',
				path: '/upgrade',
				mux: true,
				packetEncoding: 'xudp',
			},
			security: {
				type: 'tls',
				serverName: 'edge.example.com',
				alpn: ['h2', 'http/1.1'],
				allowInsecure: true,
			},
			authentication: {
				id: '11111111-1111-4111-8111-111111111111',
				encryption: 'none',
			},
		})
	})

	it('parses REALITY spiderX and TCP HTTP header type', () => {
		const [profile] = parseConnectionUrl(
			'vless://11111111-1111-4111-8111-111111111111@example.com:443?type=tcp&headerType=http&security=reality&sni=www.example.com&fp=chrome&pbk=public-key&sid=abcd&spx=%2Fspider#Reality',
		)

		expect(profile).toMatchObject({
			transport: {
				type: 'tcp',
				headerType: 'http',
			},
			security: {
				type: 'reality',
				serverName: 'www.example.com',
				fingerprint: 'chrome',
				publicKey: 'public-key',
				shortId: 'abcd',
				spiderX: '/spider',
			},
		})
	})

	it('parses VMess header type, encryption, ALPN, and allowInsecure', () => {
		const [profile] = parseConnectionUrl(
			vmessUrl({
				add: 'vmess.example.com',
				alpn: 'h2,http/1.1',
				allowInsecure: '1',
				id: '22222222-2222-4222-8222-222222222222',
				net: 'tcp',
				port: '443',
				ps: 'VMess TCP',
				scy: 'zero',
				sni: 'vmess.example.com',
				tls: 'tls',
				type: 'http',
				v: '2',
			}),
		)

		expect(profile).toMatchObject({
			transport: {
				type: 'tcp',
				headerType: 'http',
			},
			security: {
				type: 'tls',
				serverName: 'vmess.example.com',
				alpn: ['h2', 'http/1.1'],
				allowInsecure: true,
			},
			authentication: {
				id: '22222222-2222-4222-8222-222222222222',
				encryption: 'zero',
			},
		})
	})

	it('infers TLS for panel Trojan links that omit security=', () => {
		const [profile] = parseConnectionUrl(
			'trojan://11111111-1111-4111-8111-111111111111@panel.example.com:443?allowInsecure=0&peer=edge.example.com&sni=grm.example.com&fp=chrome&type=ws#Usage',
		)

		expect(profile.security).toMatchObject({
			type: 'tls',
			serverName: 'grm.example.com',
			fingerprint: 'chrome',
			allowInsecure: false,
		})
		expect(profile.transport).toMatchObject({ type: 'ws' })
	})

	it('parses panel Trojan links that use insecure, websocket, and TLS aliases', () => {
		const [profile] = parseConnectionUrl(
			'trojan://5486e8b2-7109-43d9-a6e8-1d366f4a2a69@allnetwork.example.com:443?insecure=1&fp=chrome&sni=gote.example.com&allowInsecure=1&type=ws&security=tls#Germany',
		)

		expect(profile).toMatchObject({
			protocol: 'trojan',
			endpoint: {
				host: 'allnetwork.example.com',
				port: 443,
			},
			transport: {
				type: 'ws',
			},
			security: {
				type: 'tls',
				serverName: 'gote.example.com',
				fingerprint: 'chrome',
				allowInsecure: true,
			},
			authentication: {
				password: '5486e8b2-7109-43d9-a6e8-1d366f4a2a69',
			},
			metadata: {
				name: 'Germany',
			},
		})
	})

	it('parses panel VMess links that duplicate transport in type and use insecure', () => {
		const [profile] = parseConnectionUrl(
			vmessUrl({
				add: 'allnetwork.example.com',
				aid: '0',
				alpn: '',
				fp: 'chrome',
				id: '5486e8b2-7109-43d9-a6e8-1d366f4a2a69',
				insecure: '0',
				net: 'ws',
				port: '443',
				ps: 'Germany',
				scy: 'auto',
				sni: 'hlhl.example.com',
				tls: 'tls',
				type: 'ws',
				v: '2',
			}),
		)

		expect(profile).toMatchObject({
			protocol: 'vmess',
			endpoint: {
				host: 'allnetwork.example.com',
				port: 443,
			},
			transport: {
				type: 'ws',
			},
			security: {
				type: 'tls',
				serverName: 'hlhl.example.com',
				fingerprint: 'chrome',
				allowInsecure: false,
			},
			authentication: {
				id: '5486e8b2-7109-43d9-a6e8-1d366f4a2a69',
				encryption: 'auto',
			},
			metadata: {
				name: 'Germany',
			},
		})
		expect(profile.transport?.headerType).toBeUndefined()
	})

	it('parses pretty-printed VMess JSON used by panel exporters', () => {
		const payload = `{
  "add" : "allnetwork.example.com",
  "aid" : "0",
  "alpn" : "",
  "fp" : "chrome",
  "id" : "5486e8b2-7109-43d9-a6e8-1d366f4a2a69",
  "insecure" : "0",
  "net" : "ws",
  "port" : "443",
  "ps" : "Germany",
  "scy" : "auto",
  "sni" : "hlhl.example.com",
  "tls" : "tls",
  "type" : "ws",
  "v" : "2"
}`
		const [profile] = parseConnectionUrl(`vmess://${globalThis.btoa(payload)}`)

		expect(profile).toMatchObject({
			protocol: 'vmess',
			endpoint: { host: 'allnetwork.example.com', port: 443 },
			transport: { type: 'ws' },
			security: {
				type: 'tls',
				serverName: 'hlhl.example.com',
				fingerprint: 'chrome',
			},
		})
	})

	it('fails closed for invalid packet encoding and header types', () => {
		expect(() =>
			parseConnectionUrl(
				'vless://11111111-1111-4111-8111-111111111111@example.com:443?type=tcp&packetEncoding=kcp',
			),
		).toThrow(ProfileError)
		expect(() =>
			parseConnectionUrl(
				'vless://11111111-1111-4111-8111-111111111111@example.com:443?type=tcp&headerType=wechat',
			),
		).toThrow(ProfileError)
	})
})

describe('protocol URL serialization', () => {
	it('serializes VLESS and preserves parse/serialize round trips', () => {
		const [profile] = parseConnectionUrl(
			'vless://11111111-1111-4111-8111-111111111111@example.com:443?type=ws&security=tls&sni=edge.example.com&path=%2Fws#Primary',
		)
		const [roundTrip] = parseConnectionUrl(serializeConnectionProfile(profile))

		expect(roundTrip).toEqual({ ...profile, id: roundTrip.id })
		expect(roundTrip.id).not.toBe(profile.id)
	})

	it('serializes Trojan and preserves parse/serialize round trips', () => {
		const [profile] = parseConnectionUrl(
			'trojan://secret@example.net:8443?security=tls&sni=tls.example.net#Trojan',
		)
		const [roundTrip] = parseConnectionUrl(serializeConnectionProfile(profile))

		expect(roundTrip).toEqual({ ...profile, id: roundTrip.id })
		expect(roundTrip.id).not.toBe(profile.id)
	})

	it('serializes VMess and preserves supported fields', () => {
		const [profile] = parseConnectionUrl(
			vmessUrl({
				add: 'vmess.example.com',
				id: '22222222-2222-4222-8222-222222222222',
				net: 'ws',
				path: '/ray',
				port: '443',
				ps: 'VMess',
				sni: 'vmess.example.com',
				tls: 'tls',
				v: '2',
			}),
		)
		const [roundTrip] = parseConnectionUrl(serializeConnectionProfile(profile))

		expect(roundTrip).toMatchObject({ ...profile, id: roundTrip.id })
		expect(roundTrip.id).not.toBe(profile.id)
	})

	it('serializes VLESS REALITY gRPC and preserves supported fields', () => {
		const [profile] = parseConnectionUrl(
			'vless://11111111-1111-4111-8111-111111111111@example.com:443?type=grpc&serviceName=edge&security=reality&sni=server.example.com&fp=chrome&pbk=public-key&sid=abcd&flow=xtls-rprx-vision#Reality',
		)
		const [roundTrip] = parseConnectionUrl(serializeConnectionProfile(profile))

		expect(roundTrip).toEqual({ ...profile, id: roundTrip.id })
		expect(roundTrip.id).not.toBe(profile.id)
	})

	it('round-trips HTTPUpgrade TLS and REALITY TCP HTTP header share links', () => {
		const [upgrade] = parseConnectionUrl(
			'vless://11111111-1111-4111-8111-111111111111@example.com:443?type=httpupgrade&security=tls&sni=edge.example.com&host=cdn.example.com&path=%2Fupgrade&alpn=h2,http/1.1&allowInsecure=1&mux=1&packetEncoding=xudp&encryption=none#Upgrade',
		)
		const [reality] = parseConnectionUrl(
			'vless://11111111-1111-4111-8111-111111111111@example.com:443?type=tcp&headerType=http&security=reality&sni=www.example.com&fp=chrome&pbk=public-key&sid=abcd&spx=%2Fspider#Reality',
		)

		const [upgradeRoundTrip] = parseConnectionUrl(
			serializeConnectionProfile(upgrade),
		)
		const [realityRoundTrip] = parseConnectionUrl(
			serializeConnectionProfile(reality),
		)

		expect(upgradeRoundTrip).toEqual({
			...upgrade,
			id: upgradeRoundTrip.id,
		})
		expect(realityRoundTrip).toEqual({
			...reality,
			id: realityRoundTrip.id,
		})
		expect(upgradeRoundTrip.id).not.toBe(upgrade.id)
		expect(realityRoundTrip.id).not.toBe(reality.id)
	})
})
