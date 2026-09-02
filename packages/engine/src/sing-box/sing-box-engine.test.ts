import { EngineError } from '@rahrow/core/errors.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { describe, expect, it } from 'vitest'

import {
	NoopSingBoxProcess,
	SingBoxConfigBuilder,
	SingBoxEngine,
} from './sing-box-engine.ts'

const profile: ConnectionProfile = {
	id: 'profile-1',
	protocol: 'vless',
	endpoint: { host: 'example.com', port: 443 },
	authentication: {
		id: '11111111-1111-4111-8111-111111111111',
		flow: 'xtls-rprx-vision',
	},
	security: {
		type: 'reality',
		serverName: 'reality.example.com',
		fingerprint: 'chrome',
		publicKey: 'public-key',
		shortId: 'abcd',
	},
	transport: {
		type: 'grpc',
		serviceName: 'grpc-service',
		mux: true,
		packetEncoding: 'xudp',
	},
}

describe('SingBoxConfigBuilder', () => {
	it('compiles Hysteria2 and SSH without disabling TLS or host-key verification', () => {
		const builder = new SingBoxConfigBuilder()

		expect(
			builder.build({
				profile: {
					id: 'hy2-1',
					protocol: 'hysteria2',
					endpoint: { host: 'hy2.example.com', port: 443 },
					authentication: { password: 'secret' },
					security: { type: 'tls', serverName: 'hy2.example.com' },
				},
			}).outbounds[0],
		).toEqual({
			type: 'hysteria2',
			tag: 'proxy',
			server: 'hy2.example.com',
			server_port: 443,
			password: 'secret',
			tls: { enabled: true, server_name: 'hy2.example.com' },
		})

		expect(
			builder.build({
				profile: {
					id: 'ssh-1',
					protocol: 'ssh',
					endpoint: { host: 'ssh.example.com', port: 22 },
					authentication: {
						username: 'alice',
						password: 'secret',
						hostKey: 'ssh-ed25519 AAAA-test',
					},
				},
			}).outbounds[0],
		).toEqual({
			type: 'ssh',
			tag: 'proxy',
			server: 'ssh.example.com',
			server_port: 22,
			user: 'alice',
			password: 'secret',
			host_key: ['ssh-ed25519 AAAA-test'],
		})
	})

	it('compiles Shadowsocks with its exact advertised method', () => {
		const config = new SingBoxConfigBuilder().build({
			profile: {
				id: 'ss-1',
				protocol: 'shadowsocks',
				endpoint: { host: 'ss.example.com', port: 8388 },
				authentication: {
					method: 'xchacha20-ietf-poly1305',
					password: 'secret',
				},
			},
		})

		expect(config.outbounds[0]).toEqual({
			type: 'shadowsocks',
			tag: 'proxy',
			server: 'ss.example.com',
			server_port: 8388,
			method: 'xchacha20-ietf-poly1305',
			password: 'secret',
		})
	})

	it('generates a sing-box VLESS REALITY gRPC client config', () => {
		const config = new SingBoxConfigBuilder().build({
			profile,
			localPort: 12080,
		})

		expect(config.inbounds).toEqual([
			{
				type: 'mixed',
				tag: 'mixed-in',
				listen: '127.0.0.1',
				listen_port: 12080,
			},
		])
		expect(config.outbounds[0]).toEqual({
			type: 'vless',
			tag: 'proxy',
			server: 'example.com',
			server_port: 443,
			uuid: '11111111-1111-4111-8111-111111111111',
			flow: 'xtls-rprx-vision',
			packet_encoding: 'xudp',
			tls: {
				enabled: true,
				server_name: 'reality.example.com',
				utls: { enabled: true, fingerprint: 'chrome' },
				reality: {
					enabled: true,
					public_key: 'public-key',
					short_id: 'abcd',
				},
			},
			transport: { type: 'grpc', service_name: 'grpc-service' },
			multiplex: { enabled: true },
		})
		expect(config.outbounds.slice(1)).toEqual([
			{ type: 'direct', tag: 'direct' },
			{ type: 'block', tag: 'block' },
		])
	})

	it('maps VMess TLS WebSocket fields without exposing Xray JSON shapes', () => {
		const config = new SingBoxConfigBuilder().build({
			profile: {
				...profile,
				protocol: 'vmess',
				authentication: {
					id: '11111111-1111-4111-8111-111111111111',
					encryption: 'auto',
				},
				security: {
					type: 'tls',
					serverName: 'example.com',
					allowInsecure: true,
					alpn: ['h2', 'http/1.1'],
				},
				transport: { type: 'ws', host: 'cdn.example.com', path: '/ray' },
			},
		})

		expect(config.outbounds[0]).toMatchObject({
			type: 'vmess',
			uuid: '11111111-1111-4111-8111-111111111111',
			security: 'auto',
			tls: {
				enabled: true,
				server_name: 'example.com',
				insecure: true,
				alpn: ['h2', 'http/1.1'],
			},
			transport: {
				type: 'ws',
				path: '/ray',
				headers: { Host: 'cdn.example.com' },
			},
		})
	})

	it('generates a real dual-stack TUN inbound for VPN mode', () => {
		const config = new SingBoxConfigBuilder().build({
			profile,
			mode: 'vpn',
		})

		expect(config.inbounds).toEqual([
			{
				type: 'tun',
				tag: 'tun-in',
				address: ['172.19.0.1/30', 'fdfe:dcba:9876::1/126'],
				mtu: 9000,
				auto_route: true,
				strict_route: true,
				stack: 'mixed',
			},
		])
		expect(config.route).toEqual({
			auto_detect_interface: true,
			final: 'proxy',
		})
	})
})

describe('SingBoxEngine', () => {
	it('implements the ProxyEngine lifecycle under the sing-box id', async () => {
		const process = new NoopSingBoxProcess()
		const engine = new SingBoxEngine(process)

		expect(engine.id).toBe('sing-box')
		expect(engine.manifest.supportedProtocols).toEqual([
			'vless',
			'vmess',
			'trojan',
			'shadowsocks',
			'hysteria',
			'hysteria2',
			'ssh',
		])
		await engine.start({ profile })
		await expect(engine.status()).resolves.toMatchObject({ status: 'running' })
		expect(process.startedConfigs).toHaveLength(1)

		await engine.stop()
		await expect(engine.status()).resolves.toMatchObject({ status: 'stopped' })
	})

	it('fails before process start when required credentials are missing', async () => {
		const process = new NoopSingBoxProcess()
		const engine = new SingBoxEngine(process)

		await expect(
			engine.start({ profile: { ...profile, authentication: undefined } }),
		).rejects.toBeInstanceOf(EngineError)
		expect(process.startedConfigs).toEqual([])
	})
})
