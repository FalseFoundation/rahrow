import {
	type Clock,
	SystemClock,
} from '@rahrow/core/connection/connection-controller.ts'
import {
	EngineError,
	type ErrorCode,
	errorMessage,
} from '@rahrow/core/errors.ts'
import type { Logger } from '@rahrow/core/logging/logger.ts'
import { silentLogger } from '@rahrow/core/logging/silent-logger.ts'
import type {
	ConnectionProfile,
	Security,
	Transport,
} from '@rahrow/core/profile/connection-profile.ts'
import type {
	EngineHealth,
	EngineStartInput,
	LatencyResult,
	ProxyEngine,
} from '@rahrow/core/runtime/proxy-engine.ts'

export interface SingBoxProcess {
	start(config: SingBoxConfig): Promise<void>
	stop(): Promise<void>
}

export interface SingBoxLatencyProbe {
	test(profile: ConnectionProfile): Promise<LatencyResult>
}

export interface SingBoxConfig {
	readonly log: { readonly level: 'warn' }
	readonly inbounds: readonly SingBoxInbound[]
	readonly outbounds: readonly SingBoxOutbound[]
	readonly route?: {
		readonly auto_detect_interface: true
		readonly final: 'proxy'
	}
}

export type SingBoxInbound =
	| {
			readonly type: 'mixed'
			readonly tag: 'mixed-in'
			readonly listen: '127.0.0.1'
			readonly listen_port: number
	  }
	| {
			readonly type: 'tun'
			readonly tag: 'tun-in'
			readonly address: readonly [string, string]
			readonly mtu: 9000
			readonly auto_route: true
			readonly strict_route: true
			readonly stack: 'mixed'
	  }

export type SingBoxOutbound = Readonly<Record<string, unknown>> & {
	readonly type:
		| 'vless'
		| 'vmess'
		| 'trojan'
		| 'shadowsocks'
		| 'hysteria'
		| 'hysteria2'
		| 'ssh'
		| 'direct'
		| 'block'
	readonly tag: 'proxy' | 'direct' | 'block'
}

export class SingBoxConfigBuilder {
	build(input: EngineStartInput): SingBoxConfig {
		const localPort = input.localPort ?? 10808
		assertPort(localPort)
		const vpn = input.mode === 'vpn'

		return {
			log: { level: 'warn' },
			inbounds: [
				vpn
					? {
							type: 'tun',
							tag: 'tun-in',
							address: ['172.19.0.1/30', 'fdfe:dcba:9876::1/126'],
							mtu: 9000,
							auto_route: true,
							strict_route: true,
							stack: 'mixed',
						}
					: {
							type: 'mixed',
							tag: 'mixed-in',
							listen: '127.0.0.1',
							listen_port: localPort,
						},
			],
			outbounds: [
				this.buildProxy(input.profile),
				{ type: 'direct', tag: 'direct' },
				{ type: 'block', tag: 'block' },
			],
			...(vpn
				? {
						route: { auto_detect_interface: true as const, final: 'proxy' as const },
					}
				: {}),
		}
	}

	private buildProxy(profile: ConnectionProfile): SingBoxOutbound {
		if (profile.protocol === 'hysteria' || profile.protocol === 'hysteria2') {
			const tls = buildTls(profile.security)
			if (!tls) {
				throw new EngineError('invalid_profile', 'Hysteria requires TLS')
			}

			return cleanRecord({
				type: profile.protocol,
				tag: 'proxy' as const,
				server: profile.endpoint.host,
				server_port: profile.endpoint.port,
				...(profile.protocol === 'hysteria'
					? {
							auth_str: required(
								profile.authentication?.password,
								'Hysteria profile is missing a password',
							),
							up_mbps: requiredNumber(
								profile.hysteria?.upMbps,
								'Hysteria profile is missing upload bandwidth',
							),
							down_mbps: requiredNumber(
								profile.hysteria?.downMbps,
								'Hysteria profile is missing download bandwidth',
							),
							obfs: profile.hysteria?.obfsPassword,
						}
					: {
							password: required(
								profile.authentication?.password,
								'Hysteria2 profile is missing a password',
							),
							up_mbps: profile.hysteria?.upMbps,
							down_mbps: profile.hysteria?.downMbps,
							obfs: profile.hysteria?.obfsPassword
								? {
										type: 'salamander',
										password: profile.hysteria.obfsPassword,
									}
								: undefined,
						}),
				tls,
			}) as SingBoxOutbound
		}

		if (profile.protocol === 'ssh') {
			return {
				type: 'ssh',
				tag: 'proxy',
				server: profile.endpoint.host,
				server_port: profile.endpoint.port,
				user: required(
					profile.authentication?.username,
					'SSH profile is missing a username',
				),
				password: required(
					profile.authentication?.password,
					'SSH profile is missing a password',
				),
				host_key: [
					required(
						profile.authentication?.hostKey,
						'SSH profile is missing a pinned host key',
					),
				],
			}
		}

		if (profile.protocol === 'shadowsocks') {
			return {
				type: 'shadowsocks',
				tag: 'proxy',
				server: profile.endpoint.host,
				server_port: profile.endpoint.port,
				method: required(
					profile.authentication?.method,
					'Shadowsocks profile is missing a method',
				),
				password: required(
					profile.authentication?.password,
					'Shadowsocks profile is missing a password',
				),
			}
		}

		const tls = buildTls(profile.security)
		const transport = buildTransport(profile.transport)
		const shared = {
			tag: 'proxy' as const,
			server: profile.endpoint.host,
			server_port: profile.endpoint.port,
			...(tls ? { tls } : {}),
			...(transport ? { transport } : {}),
			...(profile.transport?.mux ? { multiplex: { enabled: true } } : {}),
		}

		if (profile.protocol === 'vless') {
			return {
				...shared,
				type: 'vless',
				uuid: required(
					profile.authentication?.id,
					'VLESS profile is missing a user id',
				),
				...cleanRecord({
					flow: profile.authentication?.flow,
					packet_encoding: mapPacketEncoding(profile.transport?.packetEncoding),
				}),
			}
		}

		if (profile.protocol === 'vmess') {
			return {
				...shared,
				type: 'vmess',
				uuid: required(
					profile.authentication?.id,
					'VMess profile is missing a user id',
				),
				security: profile.authentication?.encryption ?? 'auto',
			}
		}

		return {
			...shared,
			type: 'trojan',
			password: required(
				profile.authentication?.password,
				'Trojan profile is missing a password',
			),
		}
	}
}

export class NoopSingBoxProcess implements SingBoxProcess {
	readonly startedConfigs: SingBoxConfig[] = []

	async start(config: SingBoxConfig): Promise<void> {
		this.startedConfigs.push(config)
	}

	async stop(): Promise<void> {}
}

export class NoopSingBoxLatencyProbe implements SingBoxLatencyProbe {
	constructor(private readonly clock: Clock = new SystemClock()) {}

	async test(profile: ConnectionProfile): Promise<LatencyResult> {
		return {
			profileId: profile.id,
			reachable: false,
			checkedAt: this.clock.now(),
			error: 'Latency probing requires a platform sing-box runtime adapter.',
		}
	}
}

export class SingBoxEngine implements ProxyEngine {
	readonly id = 'sing-box' as const
	readonly manifest = {
		id: 'sing-box',
		supportedProtocols: [
			'vless',
			'vmess',
			'trojan',
			'shadowsocks',
			'hysteria',
			'hysteria2',
			'ssh',
		],
	} as const

	#running = false
	#lastConfig: SingBoxConfig | undefined
	#lastError: string | undefined
	readonly #logger: Logger

	constructor(
		private readonly process: SingBoxProcess = new NoopSingBoxProcess(),
		private readonly configBuilder = new SingBoxConfigBuilder(),
		private readonly latencyProbe: SingBoxLatencyProbe = new NoopSingBoxLatencyProbe(),
		private readonly clock: Clock = new SystemClock(),
		logger: Logger = silentLogger,
	) {
		this.#logger = logger.child({ module: 'sing-box' })
	}

	get lastConfig(): SingBoxConfig | undefined {
		return this.#lastConfig
	}

	async start(input: EngineStartInput): Promise<void> {
		assertNotAborted(input)
		this.assertSupportedProfile(input.profile)

		if (this.#running) {
			throw new EngineError(
				'engine_already_running',
				'sing-box is already running',
			)
		}

		this.#logger.info(
			{ profileId: input.profile.id, localPort: input.localPort },
			'Starting sing-box',
		)

		try {
			const config = this.configBuilder.build(input)
			await this.process.start(config)
			this.#lastConfig = config
			this.#running = true
			this.#lastError = undefined
			this.#logger.info({ profileId: input.profile.id }, 'sing-box started')
		} catch (error) {
			this.#running = false
			this.#lastError = errorMessage(error, 'sing-box failed to start')
			this.#logger.error(
				{ err: this.#lastError, profileId: input.profile.id },
				'sing-box start failed',
			)
			throw engineError('engine_start_failed', 'sing-box failed to start', error)
		}
	}

	async stop(): Promise<void> {
		this.#logger.info('Stopping sing-box')

		try {
			await this.process.stop()
			this.#running = false
			this.#lastError = undefined
			this.#logger.info('sing-box stopped')
		} catch (error) {
			this.#lastError = errorMessage(error, 'sing-box failed to stop')
			this.#logger.error({ err: this.#lastError }, 'sing-box stop failed')
			throw engineError('engine_stop_failed', 'sing-box failed to stop', error)
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
			throw engineError(
				'engine_health_failed',
				'sing-box health check failed',
				error,
			)
		}
	}

	private assertSupportedProfile(profile: ConnectionProfile) {
		if (!this.manifest.supportedProtocols.includes(profile.protocol)) {
			throw new EngineError(
				'invalid_profile',
				`sing-box does not support ${profile.protocol}`,
			)
		}
	}
}

function buildTls(security: Security | undefined) {
	if (!security || security.type === 'none') {
		return undefined
	}

	return cleanRecord({
		enabled: true,
		server_name: security.serverName,
		insecure: security.allowInsecure,
		alpn: security.alpn,
		utls: security.fingerprint
			? { enabled: true, fingerprint: security.fingerprint }
			: undefined,
		reality:
			security.type === 'reality'
				? {
						enabled: true,
						public_key: required(
							security.publicKey,
							'REALITY profile is missing a public key',
						),
						...(security.shortId ? { short_id: security.shortId } : {}),
					}
				: undefined,
	})
}

function buildTransport(transport: Transport | undefined) {
	if (!transport || transport.type === 'tcp') {
		if (transport?.headerType === 'http') {
			return cleanRecord({
				type: 'http',
				host: transport.host ? [transport.host] : undefined,
				path: transport.path,
			})
		}

		return undefined
	}

	if (transport.type === 'ws') {
		return cleanRecord({
			type: 'ws',
			path: transport.path,
			headers: transport.host ? { Host: transport.host } : undefined,
		})
	}

	if (transport.type === 'grpc') {
		return cleanRecord({
			type: 'grpc',
			service_name: transport.serviceName,
		})
	}

	if (transport.type === 'httpupgrade') {
		return cleanRecord({
			type: 'httpupgrade',
			host: transport.host,
			path: transport.path,
		})
	}

	throw new EngineError(
		'invalid_profile',
		'sing-box does not support V2Ray QUIC transport',
	)
}

function mapPacketEncoding(value: Transport['packetEncoding']) {
	if (!value || value === 'none') {
		return undefined
	}

	return value === 'packet' ? 'packetaddr' : value
}

function assertPort(port: number) {
	if (!Number.isInteger(port) || port < 1 || port > 65535) {
		throw new EngineError(
			'invalid_config',
			'sing-box inbound port must be an integer from 1 to 65535',
		)
	}
}

function required(value: string | undefined, message: string) {
	if (!value) {
		throw new EngineError('invalid_profile', message)
	}

	return value
}

function requiredNumber(value: number | undefined, message: string) {
	if (value === undefined) {
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
		errorMessage(input.signal.reason, 'sing-box start was canceled'),
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
