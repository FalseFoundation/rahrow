import { EngineError } from '@rahrow/core/errors.ts'
import { createLogBuffer } from '@rahrow/core/logging/log-buffer.ts'
import { createPinoLogger } from '@rahrow/core/logging/pino-logger.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { describe, expect, it } from 'vitest'

import {
	NoopXrayLatencyProbe,
	NoopXrayProcess,
	XrayConfigBuilder,
	XrayEngine,
} from './xray-engine.ts'

const profile: ConnectionProfile = {
	id: 'profile-1',
	protocol: 'vless',
	endpoint: {
		host: 'example.com',
		port: 443,
	},
	authentication: {
		id: '11111111-1111-4111-8111-111111111111',
	},
	security: {
		type: 'tls',
		serverName: 'example.com',
	},
	transport: {
		type: 'ws',
		host: 'cdn.example.com',
		path: '/ray',
	},
}

class TestClock {
	#index = 0

	now(): string {
		this.#index += 1

		return `2026-01-01T00:00:0${this.#index}.000Z`
	}
}

class TestLatencyProbe {
	error: Error | undefined

	async test(candidate: ConnectionProfile) {
		if (this.error) {
			throw this.error
		}

		return {
			profileId: candidate.id,
			reachable: true,
			checkedAt: '2026-01-01T00:00:00.000Z',
			latencyMs: 17,
		}
	}
}

class FailingXrayProcess extends NoopXrayProcess {
	startError: Error | undefined
	stopError: Error | undefined

	override async start(config: Parameters<NoopXrayProcess['start']>[0]) {
		if (this.startError) {
			throw this.startError
		}

		await super.start(config)
	}

	override async stop() {
		if (this.stopError) {
			throw this.stopError
		}
	}
}

describe('XrayEngine', () => {
	it('compiles Shadowsocks with its exact advertised method', () => {
		const config = new XrayConfigBuilder().build({
			profile: {
				id: 'ss-1',
				protocol: 'shadowsocks',
				endpoint: { host: 'ss.example.com', port: 8388 },
				authentication: {
					method: '2022-blake3-aes-128-gcm',
					password: 'base64-key',
				},
			},
		})

		expect(config.outbounds[0]).toEqual({
			tag: 'proxy',
			protocol: 'shadowsocks',
			settings: {
				servers: [
					{
						address: 'ss.example.com',
						port: 8388,
						method: '2022-blake3-aes-128-gcm',
						password: 'base64-key',
					},
				],
			},
		})
	})

	it('generates a dual-stack native TUN inbound for VPN mode', () => {
		const config = new XrayConfigBuilder().build({ profile, mode: 'vpn' })

		expect(config.inbounds).toEqual([
			{
				tag: 'tun-in',
				protocol: 'tun',
				settings: {
					desc: 'RahRow',
					mtu: 1500,
					gateway: ['172.19.0.1/30', 'fdfe:dcba:9876::1/126'],
					dns: ['1.1.1.1', '2606:4700:4700::1111'],
					autoSystemRoutingTable: ['0.0.0.0/0', '::/0'],
					autoOutboundsInterface: 'auto',
				},
			},
		])
	})

	it('models start and stop lifecycle behind the proxy engine contract', async () => {
		const engine = new XrayEngine()

		expect(engine.id).toBe('xray')
		await engine.start({ profile })
		await expect(engine.status()).resolves.toMatchObject({ status: 'running' })

		await engine.stop()
		await expect(engine.status()).resolves.toMatchObject({ status: 'stopped' })
	})

	it('records start and stop events through the injected logger', async () => {
		const logs = createLogBuffer()
		const engine = new XrayEngine(
			new NoopXrayProcess(),
			new XrayConfigBuilder(),
			new NoopXrayLatencyProbe(),
			new TestClock(),
			createPinoLogger({
				destination: logs,
				level: 'debug',
			}),
		)

		await engine.start({ profile })
		await engine.stop()

		expect(logs.records().map((record) => record.msg)).toEqual(
			expect.arrayContaining([
				'Starting Xray',
				'Xray started',
				'Stopping Xray',
				'Xray stopped',
			]),
		)
		expect(logs.records().some((record) => record.module === 'xray')).toBe(true)
	})

	it('does not probe the network until a platform latency adapter is provided', async () => {
		const engine = new XrayEngine()

		await expect(engine.test(profile)).resolves.toMatchObject({
			profileId: 'profile-1',
			reachable: false,
			error: 'Latency probing requires a platform Xray runtime adapter.',
		})
	})

	it('uses the injected clock for engine status snapshots', async () => {
		const engine = new XrayEngine(
			new NoopXrayProcess(),
			new XrayConfigBuilder(),
			new NoopXrayLatencyProbe(),
			new TestClock(),
		)

		await expect(engine.status()).resolves.toEqual({
			status: 'stopped',
			checkedAt: '2026-01-01T00:00:01.000Z',
		})
	})

	it('passes generated Xray configuration to the process boundary', async () => {
		const process = new NoopXrayProcess()
		const engine = new XrayEngine(process)

		await engine.start({ profile, localPort: 12080 })

		expect(process.startedConfigs).toHaveLength(1)
		expect(process.startedConfigs[0]?.inbounds[0]).toMatchObject({
			listen: '127.0.0.1',
			port: 12080,
			protocol: 'socks',
		})
		expect(process.startedConfigs[0]?.outbounds[0]).toMatchObject({
			protocol: 'vless',
			settings: {
				vnext: [
					{
						address: 'example.com',
						port: 443,
					},
				],
			},
			streamSettings: {
				network: 'ws',
				security: 'tls',
			},
		})
		expect(
			process.startedConfigs[0]?.outbounds.map((item) => item.protocol),
		).toEqual(['vless', 'freedom', 'blackhole'])
	})

	it('rejects a second start while running', async () => {
		const engine = new XrayEngine()

		await engine.start({ profile })
		await expect(engine.start({ profile })).rejects.toThrow(EngineError)
	})

	it('rejects unsupported profiles before touching the process boundary', async () => {
		const process = new NoopXrayProcess()
		const engine = new XrayEngine(process)

		await expect(
			engine.start({
				profile: {
					...profile,
					protocol: 'wireguard',
				} as ConnectionProfile,
			}),
		).rejects.toMatchObject({
			code: 'invalid_profile',
		})
		expect(process.startedConfigs).toEqual([])
	})

	it('cancels starts before creating runtime state', async () => {
		const process = new NoopXrayProcess()
		const engine = new XrayEngine(process)
		const controller = new AbortController()
		controller.abort('user canceled')

		await expect(
			engine.start({
				profile,
				signal: controller.signal,
			}),
		).rejects.toMatchObject({
			code: 'engine_start_failed',
		})
		expect(process.startedConfigs).toEqual([])
		await expect(engine.status()).resolves.toMatchObject({ status: 'stopped' })
	})

	it('preserves native start diagnostics that are not Error instances', async () => {
		class NativePayloadXrayProcess extends NoopXrayProcess {
			override async start(): Promise<void> {
				throw {
					message:
						'Xray sidecar was not found. Set RAHROW_XRAY_BINARY to an explicit executable path or bundle the pinned artifact from engines/xray/runtime.json.',
				}
			}
		}

		const engine = new XrayEngine(new NativePayloadXrayProcess())

		await expect(engine.start({ profile })).rejects.toMatchObject({
			code: 'engine_start_failed',
			message: expect.stringContaining('RAHROW_XRAY_BINARY'),
		})
		await expect(engine.status()).resolves.toMatchObject({
			status: 'error',
			detail: expect.stringContaining('RAHROW_XRAY_BINARY'),
		})
	})

	it('wraps start and stop process failures as engine errors', async () => {
		const process = new FailingXrayProcess()
		process.startError = new Error('spawn failed')
		const engine = new XrayEngine(process)

		await expect(engine.start({ profile })).rejects.toMatchObject({
			code: 'engine_start_failed',
		})
		await expect(engine.status()).resolves.toMatchObject({
			status: 'error',
			detail: 'spawn failed',
		})

		process.startError = undefined
		process.stopError = new Error('stop failed')
		await engine.start({ profile })

		await expect(engine.stop()).rejects.toMatchObject({
			code: 'engine_stop_failed',
		})
		await expect(engine.status()).resolves.toMatchObject({
			status: 'error',
			detail: 'stop failed',
		})
	})

	it('restarts through stop then start with the latest profile input', async () => {
		const process = new NoopXrayProcess()
		const engine = new XrayEngine(process)

		await engine.start({ profile })
		await engine.restart({
			profile: {
				...profile,
				endpoint: {
					host: 'next.example.com',
					port: 443,
				},
			},
		})

		expect(process.startedConfigs).toHaveLength(2)
		expect(process.startedConfigs[1]?.outbounds[0]?.settings).toMatchObject({
			vnext: [
				{
					address: 'next.example.com',
				},
			],
		})
	})

	it('delegates latency diagnostics to an injected probe', async () => {
		const engine = new XrayEngine(
			new NoopXrayProcess(),
			new XrayConfigBuilder(),
			new TestLatencyProbe(),
		)

		await expect(engine.test(profile)).resolves.toMatchObject({
			profileId: 'profile-1',
			reachable: true,
			latencyMs: 17,
		})
	})

	it('wraps latency probe failures as engine health errors', async () => {
		const probe = new TestLatencyProbe()
		probe.error = new Error('probe failed')
		const engine = new XrayEngine(
			new NoopXrayProcess(),
			new XrayConfigBuilder(),
			probe,
		)

		await expect(engine.test(profile)).rejects.toMatchObject({
			code: 'engine_health_failed',
		})
	})

	it('returns deterministic unavailable diagnostics by default', async () => {
		const result = await new NoopXrayLatencyProbe(new TestClock()).test(profile)

		expect(result).toEqual({
			profileId: 'profile-1',
			reachable: false,
			checkedAt: '2026-01-01T00:00:01.000Z',
			error: 'Latency probing requires a platform Xray runtime adapter.',
		})
	})
})

describe('XrayConfigBuilder', () => {
	it('generates deterministic VLESS REALITY gRPC config', () => {
		const config = new XrayConfigBuilder().build({
			localPort: 12080,
			profile: {
				...profile,
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
					id: '11111111-1111-4111-8111-111111111111',
					flow: 'xtls-rprx-vision',
				},
			},
		})

		expect(stableJson(config)).toMatchInlineSnapshot(
			`"{"dns":{"servers":["1.1.1.1","8.8.8.8"]},"inbounds":[{"listen":"127.0.0.1","port":12080,"protocol":"socks","settings":{"udp":true},"sniffing":{"destOverride":["http","tls","quic"],"enabled":true},"tag":"socks-in"}],"log":{"loglevel":"warning"},"outbounds":[{"protocol":"vless","settings":{"vnext":[{"address":"example.com","port":443,"users":[{"encryption":"none","flow":"xtls-rprx-vision","id":"11111111-1111-4111-8111-111111111111"}]}]},"streamSettings":{"grpcSettings":{"serviceName":"grpc-service"},"network":"grpc","realitySettings":{"fingerprint":"chrome","publicKey":"public-key","serverName":"reality.example.com","shortId":"abcd"},"security":"reality","sockopt":{"tcpNoDelay":true}},"tag":"proxy"},{"protocol":"freedom","tag":"direct"},{"protocol":"blackhole","tag":"block"}],"routing":{"domainStrategy":"AsIs","rules":[{"ip":["geoip:private"],"outboundTag":"direct","type":"field"}]}}"`,
		)
	})

	it('generates deterministic VMess TLS WebSocket config', () => {
		const config = new XrayConfigBuilder().build({
			profile: {
				...profile,
				protocol: 'vmess',
			},
		})

		expect(stableJson(config)).toMatchInlineSnapshot(
			`"{"dns":{"servers":["1.1.1.1","8.8.8.8"]},"inbounds":[{"listen":"127.0.0.1","port":10808,"protocol":"socks","settings":{"udp":true},"sniffing":{"destOverride":["http","tls","quic"],"enabled":true},"tag":"socks-in"}],"log":{"loglevel":"warning"},"outbounds":[{"protocol":"vmess","settings":{"vnext":[{"address":"example.com","port":443,"users":[{"alterId":0,"id":"11111111-1111-4111-8111-111111111111","security":"auto"}]}]},"streamSettings":{"network":"ws","security":"tls","sockopt":{"tcpNoDelay":true},"tlsSettings":{"serverName":"example.com"},"wsSettings":{"headers":{"Host":"cdn.example.com"},"path":"/ray"}},"tag":"proxy"},{"protocol":"freedom","tag":"direct"},{"protocol":"blackhole","tag":"block"}],"routing":{"domainStrategy":"AsIs","rules":[{"ip":["geoip:private"],"outboundTag":"direct","type":"field"}]}}"`,
		)
	})

	it('emits DNS, routing, sniffing, mux, sockopt, and freedom/blackhole outbounds', () => {
		const config = new XrayConfigBuilder().build({
			profile: {
				...profile,
				transport: {
					type: 'ws',
					host: 'cdn.example.com',
					path: '/ray',
					mux: true,
				},
				security: {
					type: 'tls',
					serverName: 'example.com',
					alpn: ['h2', 'http/1.1'],
					allowInsecure: true,
				},
			},
		})

		expect(config.dns).toMatchObject({
			servers: ['1.1.1.1', '8.8.8.8'],
		})
		expect(config.routing).toMatchObject({
			domainStrategy: 'AsIs',
			rules: [
				{
					type: 'field',
					ip: ['geoip:private'],
					outboundTag: 'direct',
				},
			],
		})
		expect(config.inbounds[0]).toMatchObject({
			sniffing: {
				enabled: true,
				destOverride: ['http', 'tls', 'quic'],
			},
		})
		expect(config.outbounds.map((outbound) => outbound.protocol)).toEqual([
			'vless',
			'freedom',
			'blackhole',
		])
		expect(config.outbounds[0]).toMatchObject({
			mux: { enabled: true },
			streamSettings: {
				sockopt: { tcpNoDelay: true },
				tlsSettings: {
					alpn: ['h2', 'http/1.1'],
					allowInsecure: true,
					serverName: 'example.com',
				},
			},
		})
	})

	it('maps REALITY spiderX, TCP HTTP header, packet encoding, and encryption', () => {
		const config = new XrayConfigBuilder().build({
			profile: {
				...profile,
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
					id: '11111111-1111-4111-8111-111111111111',
					encryption: 'none',
					flow: 'xtls-rprx-vision',
				},
			},
		})

		expect(config.outbounds[0]).toMatchObject({
			settings: {
				vnext: [
					{
						users: [
							{
								encryption: 'none',
								flow: 'xtls-rprx-vision',
								packetEncoding: 'xudp',
							},
						],
					},
				],
			},
			streamSettings: {
				network: 'tcp',
				security: 'reality',
				tcpSettings: {
					header: { type: 'http' },
				},
				realitySettings: {
					spiderX: '/spider',
					publicKey: 'public-key',
				},
			},
		})
	})

	it('fails with a typed error for REALITY without a public key', () => {
		expect(() =>
			new XrayConfigBuilder().build({
				profile: {
					...profile,
					security: {
						type: 'reality',
						serverName: 'www.example.com',
					},
				},
			}),
		).toThrow(EngineError)
	})

	it('builds Trojan outbound settings without exposing config to core', () => {
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

		expect(stableJson(config)).toMatchInlineSnapshot(
			`"{"dns":{"servers":["1.1.1.1","8.8.8.8"]},"inbounds":[{"listen":"127.0.0.1","port":10808,"protocol":"socks","settings":{"udp":true},"sniffing":{"destOverride":["http","tls","quic"],"enabled":true},"tag":"socks-in"}],"log":{"loglevel":"warning"},"outbounds":[{"protocol":"trojan","settings":{"servers":[{"address":"trojan.example.com","password":"secret","port":443}]},"streamSettings":{"network":"tcp","security":"none","sockopt":{"tcpNoDelay":true}},"tag":"proxy"},{"protocol":"freedom","tag":"direct"},{"protocol":"blackhole","tag":"block"}],"routing":{"domainStrategy":"AsIs","rules":[{"ip":["geoip:private"],"outboundTag":"direct","type":"field"}]}}"`,
		)
		expect(config.outbounds[0]).toMatchObject({
			protocol: 'trojan',
			settings: {
				servers: [
					{
						address: 'trojan.example.com',
						password: 'secret',
						port: 443,
					},
				],
			},
		})
	})
})

function stableJson(input: unknown): string {
	return JSON.stringify(sortJson(input))
}

function sortJson(input: unknown): unknown {
	if (Array.isArray(input)) {
		return input.map(sortJson)
	}

	if (typeof input !== 'object' || input === null) {
		return input
	}

	return Object.fromEntries(
		Object.entries(input as Readonly<Record<string, unknown>>)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, value]) => [key, sortJson(value)]),
	)
}
