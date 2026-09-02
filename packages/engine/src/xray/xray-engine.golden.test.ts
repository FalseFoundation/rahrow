import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { EngineError } from '@rahrow/core/errors.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { describe, expect, it } from 'vitest'

import { XrayConfigBuilder } from './xray-engine.ts'

const goldenDirectory = join(dirname(fileURLToPath(import.meta.url)), 'goldens')

function readGolden(name: string) {
	return JSON.parse(readFileSync(join(goldenDirectory, name), 'utf8')) as unknown
}

const vlessId = '11111111-1111-4111-8111-111111111111'

const baseVless: ConnectionProfile = {
	id: 'profile-1',
	protocol: 'vless',
	endpoint: {
		host: 'example.com',
		port: 443,
	},
	authentication: {
		id: vlessId,
	},
}

describe('Xray config golden snapshots', () => {
	it('locks VLESS REALITY gRPC config', () => {
		const config = new XrayConfigBuilder().build({
			localPort: 12080,
			profile: {
				...baseVless,
				security: {
					type: 'reality',
					fingerprint: 'chrome',
					publicKey: 'public-key',
					serverName: 'reality.example.com',
					shortId: 'abcd',
				},
				transport: {
					type: 'grpc',
					serviceName: 'grpc-service',
				},
				authentication: {
					id: vlessId,
					flow: 'xtls-rprx-vision',
				},
			},
		})

		expect(config).toEqual(readGolden('vless-reality-grpc.json'))
	})

	it('locks VMess TLS WebSocket config', () => {
		const config = new XrayConfigBuilder().build({
			profile: {
				...baseVless,
				protocol: 'vmess',
				security: {
					type: 'tls',
					serverName: 'example.com',
				},
				transport: {
					type: 'ws',
					host: 'cdn.example.com',
					path: '/ray',
				},
			},
		})

		expect(config).toEqual(readGolden('vmess-tls-ws.json'))
	})

	it('locks Trojan TCP config', () => {
		const config = new XrayConfigBuilder().build({
			profile: {
				id: 'trojan-1',
				protocol: 'trojan',
				endpoint: {
					host: 'trojan.example.com',
					port: 443,
				},
				authentication: {
					password: 'secret',
				},
			},
		})

		expect(config).toEqual(readGolden('trojan-tcp.json'))
	})

	it('locks VLESS HTTPUpgrade TLS config with mux and packet encoding', () => {
		const config = new XrayConfigBuilder().build({
			profile: {
				...baseVless,
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
					id: vlessId,
					encryption: 'none',
				},
			},
		})

		expect(config).toEqual(readGolden('vless-httpupgrade-tls.json'))
	})

	it('locks VLESS REALITY TCP HTTP header config', () => {
		const config = new XrayConfigBuilder().build({
			profile: {
				...baseVless,
				transport: {
					type: 'tcp',
					headerType: 'http',
					packetEncoding: 'xudp',
				},
				security: {
					type: 'reality',
					serverName: 'www.example.com',
					fingerprint: 'chrome',
					publicKey: 'public-key',
					shortId: 'abcd',
					spiderX: '/spider',
				},
				authentication: {
					id: vlessId,
					encryption: 'none',
					flow: 'xtls-rprx-vision',
				},
			},
		})

		expect(config).toEqual(readGolden('vless-reality-tcp-http.json'))
	})
})

describe('hostile Xray config input', () => {
	it('fails closed for REALITY without a public key', () => {
		expect(() =>
			new XrayConfigBuilder().build({
				profile: {
					...baseVless,
					security: {
						type: 'reality',
						serverName: 'www.example.com',
					},
				},
			}),
		).toThrow(EngineError)
	})

	it('fails closed for VLESS without a user id', () => {
		expect(() =>
			new XrayConfigBuilder().build({
				profile: {
					...baseVless,
					authentication: {},
				},
			}),
		).toThrow(EngineError)
	})

	it('fails closed for Trojan without a password', () => {
		expect(() =>
			new XrayConfigBuilder().build({
				profile: {
					id: 'trojan-1',
					protocol: 'trojan',
					endpoint: {
						host: 'trojan.example.com',
						port: 443,
					},
				},
			}),
		).toThrow(EngineError)
	})

	it('fails closed for VMess without a user id', () => {
		expect(() =>
			new XrayConfigBuilder().build({
				profile: {
					...baseVless,
					protocol: 'vmess',
					authentication: {},
				},
			}),
		).toThrow(EngineError)
	})
})
