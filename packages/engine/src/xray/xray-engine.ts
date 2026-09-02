import type { Clock } from '@rahrow/core/connection/connection-controller.ts'
import {
	EngineError,
	type ErrorCode,
	errorMessage,
} from '@rahrow/core/errors.ts'
import type { Logger } from '@rahrow/core/logging/logger.ts'
import { silentLogger } from '@rahrow/core/logging/silent-logger.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type {
	EngineHealth,
	EngineId,
	EngineStartInput,
	LatencyResult,
	ProxyEngine,
} from '@rahrow/core/runtime/proxy-engine.ts'

export interface XrayProcess {
	start(config: XrayConfig): Promise<void>
	stop(): Promise<void>
}

export interface XrayLatencyProbe {
	test(profile: ConnectionProfile): Promise<LatencyResult>
}

export interface XrayConfig {
	readonly log: {
		readonly loglevel: 'warning'
	}
	readonly dns: {
		readonly servers: readonly string[]
	}
	readonly inbounds: readonly XrayInbound[]
	readonly outbounds: readonly XrayOutbound[]
	readonly routing: {
		readonly domainStrategy: 'AsIs'
		readonly rules: readonly XrayRoutingRule[]
	}
}

export type XrayInbound =
	| {
			readonly tag: string
			readonly protocol: 'socks'
			readonly listen: string
			readonly port: number
			readonly settings: { readonly udp: boolean }
			readonly sniffing: {
				readonly enabled: boolean
				readonly destOverride: readonly string[]
			}
	  }
	| {
			readonly tag: 'tun-in'
			readonly protocol: 'tun'
			readonly settings: {
				readonly desc: 'RahRow'
				readonly mtu: 1500
				readonly gateway: readonly [string, string]
				readonly dns: readonly [string, string]
				readonly autoSystemRoutingTable: readonly [string, string]
				readonly autoOutboundsInterface: 'auto'
			}
	  }

export interface XrayOutbound {
	readonly tag: string
	readonly protocol:
		| 'vless'
		| 'vmess'
		| 'trojan'
		| 'shadowsocks'
		| 'freedom'
		| 'blackhole'
	readonly settings?: Readonly<Record<string, unknown>>
	readonly streamSettings?: Readonly<Record<string, unknown>>
	readonly mux?: {
		readonly enabled: boolean
	}
}

export interface XrayRoutingRule {
	readonly type: 'field'
	readonly outboundTag: string
	readonly ip?: readonly string[]
}

export class XrayConfigBuilder {
	build(input: EngineStartInput): XrayConfig {
		const localPort = input.localPort ?? 10808
		const proxy = this.buildOutbound(input.profile)
		const vpn = input.mode === 'vpn'

		return {
			log: {
				loglevel: 'warning',
			},
			dns: {
				servers: ['1.1.1.1', '8.8.8.8'],
			},
			inbounds: [
				vpn
					? {
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
						}
					: {
							tag: 'socks-in',
							protocol: 'socks',
							listen: '127.0.0.1',
							port: localPort,
							settings: {
								udp: true,
							},
							sniffing: {
								enabled: true,
								destOverride: ['http', 'tls', 'quic'],
							},
						},
			],
			outbounds: [
				proxy,
				{
					tag: 'direct',
					protocol: 'freedom',
				},
				{
					tag: 'block',
					protocol: 'blackhole',
				},
			],
			routing: {
				domainStrategy: 'AsIs',
				rules: [
					{
						type: 'field',
						outboundTag: 'direct',
						ip: ['geoip:private'],
					},
				],
			},
		}
	}

	private buildOutbound(profile: ConnectionProfile): XrayOutbound {
		if (profile.protocol === 'shadowsocks') {
			return {
				tag: 'proxy',
				protocol: 'shadowsocks',
				settings: {
					servers: [
						{
							address: profile.endpoint.host,
							port: profile.endpoint.port,
							method: required(
								profile.authentication?.method,
								'Shadowsocks profile is missing a method',
							),
							password: required(
								profile.authentication?.password,
								'Shadowsocks profile is missing a password',
							),
						},
					],
				},
			}
		}

		const streamSettings = buildStreamSettings(profile)
		const mux = profile.transport?.mux ? { enabled: true as const } : undefined

		if (profile.protocol === 'vless') {
			return {
				tag: 'proxy',
				protocol: 'vless',
				settings: {
					vnext: [
						{
							address: profile.endpoint.host,
							port: profile.endpoint.port,
							users: [
								cleanRecord({
									encryption: profile.authentication?.encryption ?? 'none',
									flow: profile.authentication?.flow,
									id: required(
										profile.authentication?.id,
										'VLESS profile is missing a user id',
									),
									packetEncoding: profile.transport?.packetEncoding,
								}),
							],
						},
					],
				},
				streamSettings,
				...(mux ? { mux } : {}),
			}
		}

		if (profile.protocol === 'vmess') {
			return {
				tag: 'proxy',
				protocol: 'vmess',
				settings: {
					vnext: [
						{
							address: profile.endpoint.host,
							port: profile.endpoint.port,
							users: [
								{
									id: required(
										profile.authentication?.id,
										'VMess profile is missing a user id',
									),
									alterId: 0,
									security: profile.authentication?.encryption ?? 'auto',
								},
							],
						},
					],
				},
				streamSettings,
				...(mux ? { mux } : {}),
			}
		}

		if (profile.protocol !== 'trojan') {
			throw new EngineError(
				'invalid_profile',
				`Xray does not support ${profile.protocol}`,
			)
		}

		return {
			tag: 'proxy',
			protocol: 'trojan',
			settings: {
				servers: [
					{
						address: profile.endpoint.host,
						port: profile.endpoint.port,
						password: required(
							profile.authentication?.password,
							'Trojan profile is missing a password',
						),
					},
				],
			},
			streamSettings,
			...(mux ? { mux } : {}),
		}
	}
}

export class NoopXrayProcess implements XrayProcess {
	readonly startedConfigs: XrayConfig[] = []

	async start(config: XrayConfig): Promise<void> {
		this.startedConfigs.push(config)
	}

	async stop(): Promise<void> {}
}

export class SystemClock implements Clock {
	now(): string {
		return new Date().toISOString()
	}
}

export class NoopXrayLatencyProbe implements XrayLatencyProbe {
	constructor(private readonly clock: Clock = new SystemClock()) {}

	async test(profile: ConnectionProfile): Promise<LatencyResult> {
		return {
			profileId: profile.id,
			reachable: false,
			checkedAt: this.clock.now(),
			error: 'Latency probing requires a platform Xray runtime adapter.',
		}
	}
}

export class XrayEngine implements ProxyEngine {
	readonly id: EngineId = 'xray'
	readonly manifest = {
		id: 'xray',
		supportedProtocols: ['vless', 'vmess', 'trojan', 'shadowsocks'],
	} as const

	#running = false
	#lastConfig: XrayConfig | undefined
	#lastError: string | undefined
	readonly #logger: Logger

	constructor(
		private readonly process: XrayProcess = new NoopXrayProcess(),
		private readonly configBuilder = new XrayConfigBuilder(),
		private readonly latencyProbe: XrayLatencyProbe = new NoopXrayLatencyProbe(),
		private readonly clock: Clock = new SystemClock(),
		logger: Logger = silentLogger,
	) {
		this.#logger = logger.child({ module: 'xray' })
	}

	get lastConfig(): XrayConfig | undefined {
		return this.#lastConfig
	}

	async start(input: EngineStartInput): Promise<void> {
		assertNotAborted(input)
		this.assertSupportedProfile(input.profile)

		if (this.#running) {
			throw new EngineError('engine_already_running', 'Xray is already running')
		}

		this.#logger.info(
			{
				profileId: input.profile.id,
				localPort: input.localPort,
			},
			'Starting Xray',
		)

		try {
			const config = this.configBuilder.build(input)
			await this.process.start(config)
			this.#lastConfig = config
			this.#running = true
			this.#lastError = undefined
			this.#logger.info({ profileId: input.profile.id }, 'Xray started')
		} catch (error) {
			this.#running = false
			this.#lastError = errorMessage(error, 'Xray failed to start')
			this.#logger.error(
				{
					err: this.#lastError,
					profileId: input.profile.id,
				},
				'Xray start failed',
			)
			throw engineError('engine_start_failed', 'Xray failed to start', error)
		}
	}

	async stop(): Promise<void> {
		this.#logger.info('Stopping Xray')

		try {
			await this.process.stop()
			this.#running = false
			this.#lastError = undefined
			this.#logger.info('Xray stopped')
		} catch (error) {
			this.#lastError = errorMessage(error, 'Xray failed to stop')
			this.#logger.error({ err: this.#lastError }, 'Xray stop failed')
			throw engineError('engine_stop_failed', 'Xray failed to stop', error)
		}
	}

	async restart(input: EngineStartInput): Promise<void> {
		await this.stop()
		await this.start(input)
	}

	async status(): Promise<EngineHealth> {
		if (this.#lastError) {
			return {
				status: 'error',
				checkedAt: this.clock.now(),
				detail: this.#lastError,
			}
		}

		return {
			status: this.#running ? 'running' : 'stopped',
			checkedAt: this.clock.now(),
		}
	}

	async test(profile: ConnectionProfile): Promise<LatencyResult> {
		this.assertSupportedProfile(profile)

		try {
			return await this.latencyProbe.test(profile)
		} catch (error) {
			throw engineError('engine_health_failed', 'Xray health check failed', error)
		}
	}

	private assertSupportedProfile(profile: ConnectionProfile) {
		if (
			!(this.manifest.supportedProtocols as readonly string[]).includes(
				profile.protocol,
			)
		) {
			throw new EngineError(
				'invalid_profile',
				`Xray does not support ${profile.protocol}`,
			)
		}
	}
}

function buildStreamSettings(profile: ConnectionProfile) {
	const transport = profile.transport
	const security = profile.security
	const network = transport?.type ?? 'tcp'
	const streamSettings: Record<string, unknown> = {
		network,
		security: security?.type ?? 'none',
		sockopt: {
			tcpNoDelay: true,
		},
	}

	if (security?.type === 'tls') {
		streamSettings.tlsSettings = cleanRecord({
			alpn: security.alpn,
			allowInsecure: security.allowInsecure,
			fingerprint: security.fingerprint,
			serverName: security.serverName,
		})
	}

	if (security?.type === 'reality') {
		streamSettings.realitySettings = cleanRecord({
			fingerprint: security.fingerprint,
			publicKey: required(
				security.publicKey,
				'REALITY profile is missing a public key',
			),
			serverName: security.serverName,
			shortId: security.shortId,
			spiderX: security.spiderX,
		})
	}

	if (network === 'tcp' && transport?.headerType) {
		streamSettings.tcpSettings = {
			header: {
				type: transport.headerType,
			},
		}
	}

	if (transport?.type === 'ws') {
		streamSettings.wsSettings = cleanRecord({
			headers: transport.host ? { Host: transport.host } : undefined,
			path: transport.path,
		})
	}

	if (transport?.type === 'grpc') {
		streamSettings.grpcSettings = cleanRecord({
			serviceName: transport.serviceName,
		})
	}

	if (transport?.type === 'httpupgrade') {
		streamSettings.httpupgradeSettings = cleanRecord({
			host: transport.host,
			path: transport.path,
		})
	}

	if (transport?.type === 'quic') {
		streamSettings.quicSettings = {}
	}

	return cleanRecord(streamSettings)
}

function required(value: string | undefined, message: string) {
	if (!value) {
		throw new EngineError('invalid_profile', message)
	}

	return value
}

function assertNotAborted(input: EngineStartInput) {
	if (!input.signal?.aborted) {
		return
	}

	throw new EngineError(
		'engine_start_failed',
		errorMessage(input.signal.reason, 'Xray start was canceled'),
		{ cause: input.signal.reason },
	)
}

function engineError(code: ErrorCode, message: string, cause: unknown) {
	if (cause instanceof EngineError && cause.code === code) {
		return cause
	}

	return new EngineError(code, errorMessage(cause, message), { cause })
}

function cleanRecord<T extends Readonly<Record<string, unknown>>>(
	input: T,
): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(input).filter(([, value]) => value !== undefined),
	)
}
