import { ProfileError } from '../errors.ts'
import type {
	ConnectionProfile,
	Security,
	ShadowsocksMethod,
	Transport,
} from '../profile/connection-profile.ts'
import { SHADOWSOCKS_METHODS } from '../profile/connection-profile.ts'
import { parseConnectionProfile } from '../profile/profile-schema.ts'

export const SUPPORTED_PROTOCOLS = [
	'vmess',
	'vless',
	'trojan',
	'shadowsocks',
	'hysteria',
	'hysteria2',
	'ssh',
] as const

export type Protocol = (typeof SUPPORTED_PROTOCOLS)[number]

export function isProtocol(value: unknown): value is Protocol {
	return (
		typeof value === 'string' && SUPPORTED_PROTOCOLS.includes(value as Protocol)
	)
}

export interface ConnectionParser {
	canParse(input: string): boolean
	parse(input: string): readonly ConnectionProfile[]
}

export interface ConnectionSerializer {
	readonly protocol: Protocol
	serialize(profile: ConnectionProfile): string
}

export class ProtocolRegistry {
	constructor(
		private readonly parsers: readonly ConnectionParser[] = [
			new VlessParser(),
			new VmessParser(),
			new TrojanParser(),
			new ShadowsocksParser(),
			new HysteriaParser(),
			new Hysteria2Parser(),
			new SshParser(),
		],
		private readonly serializers: readonly ConnectionSerializer[] = [
			new VlessSerializer(),
			new VmessSerializer(),
			new TrojanSerializer(),
			new ShadowsocksSerializer(),
			new HysteriaSerializer(),
			new Hysteria2Serializer(),
			new SshSerializer(),
		],
	) {}

	parse(input: string): readonly ConnectionProfile[] {
		const value = input.trim()
		const parser = this.parsers.find((candidate) => candidate.canParse(value))

		if (!parser) {
			throw new ProfileError('invalid_profile', 'Unsupported connection URL')
		}

		return parser.parse(value)
	}

	serialize(profile: ConnectionProfile): string {
		const serializer = this.serializers.find(
			(candidate) => candidate.protocol === profile.protocol,
		)

		if (!serializer) {
			throw new ProfileError(
				'invalid_profile',
				`Unsupported protocol ${profile.protocol}`,
			)
		}

		return serializer.serialize(profile)
	}
}

export class VlessParser implements ConnectionParser {
	canParse(input: string): boolean {
		return input.trim().startsWith('vless://')
	}

	parse(input: string): readonly ConnectionProfile[] {
		const url = parseUrl(input, 'vless')
		const id = decodeRequired(url.username, 'VLESS URL is missing a user id')
		const transport = parseTransport(url.searchParams)
		const security = parseSecurity(url.searchParams)
		const profile = parseConnectionProfile({
			id: profileId('vless', url.hostname, parsePort(url.port)),
			protocol: 'vless',
			endpoint: endpointFromUrl(url),
			...(transport ? { transport } : {}),
			...(security ? { security } : {}),
			authentication: compactRecord({
				id,
				encryption: optionalParam(url.searchParams, 'encryption'),
				flow: optionalParam(url.searchParams, 'flow'),
			}),
			metadata: metadataFromUrl(url),
		})

		return [profile]
	}
}

export class TrojanParser implements ConnectionParser {
	canParse(input: string): boolean {
		return input.trim().startsWith('trojan://')
	}

	parse(input: string): readonly ConnectionProfile[] {
		const url = parseUrl(input, 'trojan')
		const password = decodeRequired(
			url.username,
			'Trojan URL is missing a password',
		)
		const profile = parseConnectionProfile({
			id: profileId('trojan', url.hostname, parsePort(url.port)),
			protocol: 'trojan',
			endpoint: endpointFromUrl(url),
			...(parseTransport(url.searchParams)
				? { transport: parseTransport(url.searchParams) }
				: {}),
			security: parseSecurity(url.searchParams, 'tls'),
			authentication: {
				password,
			},
			metadata: metadataFromUrl(url),
		})

		return [profile]
	}
}

export class VmessParser implements ConnectionParser {
	canParse(input: string): boolean {
		return input.trim().startsWith('vmess://')
	}

	parse(input: string): readonly ConnectionProfile[] {
		const payload = input.trim().slice('vmess://'.length)
		const raw = parseVmessPayload(payload)
		assertAllowedVmessKeys(raw)
		const host = requireString(raw.add, 'VMess URL is missing a host')
		const port = parseVmessPort(raw.port)
		const id = requireString(raw.id, 'VMess URL is missing a user id')
		const transport = parseVmessTransport(raw)
		const security = parseVmessSecurity(raw)
		const profile = parseConnectionProfile({
			id: profileId('vmess', host, port),
			protocol: 'vmess',
			endpoint: {
				host,
				port,
			},
			transport,
			security,
			authentication: compactRecord({
				id,
				encryption: optionalString(raw.scy),
			}),
			metadata: {
				name: optionalString(raw.ps),
				source: 'url',
			},
		})

		return [profile]
	}
}

export class ShadowsocksParser implements ConnectionParser {
	canParse(input: string): boolean {
		return input.trim().startsWith('ss://')
	}

	parse(input: string): readonly ConnectionProfile[] {
		const url = parseUrl(input, 'shadowsocks', 'ss')

		if (url.search || (url.pathname && url.pathname !== '/')) {
			throw new ProfileError(
				'invalid_profile',
				'Shadowsocks plugins and paths are not supported',
			)
		}

		const isPlainUserInfo = Boolean(url.password)
		const credentials = isPlainUserInfo
			? `${decodeUrlComponent(url.username)}:${decodeUrlComponent(url.password)}`
			: decodeShadowsocksUserInfo(url.username)
		const separator = credentials.indexOf(':')
		const method = credentials.slice(0, separator)
		const password = credentials.slice(separator + 1)

		if (separator < 1 || !password) {
			throw new ProfileError(
				'invalid_profile',
				'Malformed Shadowsocks credentials',
			)
		}
		assertShadowsocksMethod(method)
		if (method.startsWith('2022-') && !isPlainUserInfo) {
			throw new ProfileError(
				'invalid_profile',
				'AEAD-2022 Shadowsocks credentials must use plain percent-encoded userinfo',
			)
		}

		return [
			parseConnectionProfile({
				id: profileId('shadowsocks', url.hostname, parsePort(url.port)),
				protocol: 'shadowsocks',
				endpoint: endpointFromUrl(url),
				authentication: { method, password },
				metadata: metadataFromUrl(url),
			}),
		]
	}
}

export class HysteriaParser implements ConnectionParser {
	canParse(input: string): boolean {
		return input.trim().startsWith('hysteria://')
	}

	parse(input: string): readonly ConnectionProfile[] {
		const url = parseUrl(input, 'hysteria')
		if (url.username || url.password) {
			throw new ProfileError(
				'invalid_profile',
				'Hysteria v1 authentication must use the auth query parameter',
			)
		}
		const protocol = optionalParam(url.searchParams, 'protocol') ?? 'udp'
		if (protocol !== 'udp') {
			throw new ProfileError(
				'invalid_profile',
				'Unsupported Hysteria v1 transport',
			)
		}
		const obfs = optionalParam(url.searchParams, 'obfs')
		if (obfs && obfs !== 'xplus') {
			throw new ProfileError(
				'invalid_profile',
				'Unsupported Hysteria v1 obfuscation',
			)
		}
		const password = decodeRequired(
			url.searchParams.get('auth') ?? '',
			'Hysteria URL is missing an authentication password',
		)

		return [
			parseConnectionProfile({
				id: profileId('hysteria', url.hostname, parsePort(url.port)),
				protocol: 'hysteria',
				endpoint: endpointFromUrl(url),
				authentication: { password },
				security: parseSecurity(url.searchParams, 'tls'),
				hysteria: {
					upMbps: parsePositiveNumber(url.searchParams, 'upmbps'),
					downMbps: parsePositiveNumber(url.searchParams, 'downmbps'),
					obfsPassword: optionalParam(url.searchParams, 'obfsParam'),
				},
				metadata: metadataFromUrl(url),
			}),
		]
	}
}

export class Hysteria2Parser implements ConnectionParser {
	canParse(input: string): boolean {
		const value = input.trim()
		return value.startsWith('hy2://') || value.startsWith('hysteria2://')
	}

	parse(input: string): readonly ConnectionProfile[] {
		const scheme = input.trim().startsWith('hy2://') ? 'hy2' : 'hysteria2'
		const url = parseUrl(input, 'hysteria2', scheme)
		const password = decodeRequired(
			url.username,
			'Hysteria2 URL is missing an authentication password',
		)

		return [
			parseConnectionProfile({
				id: profileId('hysteria2', url.hostname, parsePort(url.port)),
				protocol: 'hysteria2',
				endpoint: endpointFromUrl(url),
				authentication: { password },
				security: parseSecurity(url.searchParams, 'tls'),
				hysteria: {
					upMbps: parseOptionalPositiveNumber(url.searchParams, 'upmbps'),
					downMbps: parseOptionalPositiveNumber(url.searchParams, 'downmbps'),
					obfsPassword: optionalParam(url.searchParams, 'obfs-password'),
				},
				metadata: metadataFromUrl(url),
			}),
		]
	}
}

export class SshParser implements ConnectionParser {
	canParse(input: string): boolean {
		return input.trim().startsWith('ssh://')
	}

	parse(input: string): readonly ConnectionProfile[] {
		const url = parseUrl(input, 'ssh')
		const username = decodeRequired(url.username, 'SSH URL is missing a username')
		const password = decodeRequired(url.password, 'SSH URL is missing a password')
		const hostKey = optionalParam(url.searchParams, 'hostKey')

		if (!hostKey) {
			throw new ProfileError(
				'invalid_profile',
				'SSH URL is missing a pinned host key',
			)
		}

		return [
			parseConnectionProfile({
				id: profileId('ssh', url.hostname, parsePort(url.port)),
				protocol: 'ssh',
				endpoint: endpointFromUrl(url),
				authentication: { username, password, hostKey },
				metadata: metadataFromUrl(url),
			}),
		]
	}
}

export class VlessSerializer implements ConnectionSerializer {
	readonly protocol = 'vless'

	serialize(profile: ConnectionProfile): string {
		assertProtocol(profile, 'vless')
		const id = requiredAuthValue(
			profile.authentication?.id,
			'VLESS profile is missing a user id',
		)
		const url = buildUrl('vless', id, profile)
		appendTransport(url.searchParams, profile.transport)
		appendSecurity(url.searchParams, profile.security)
		appendOptional(
			url.searchParams,
			'encryption',
			profile.authentication?.encryption,
		)
		appendOptional(url.searchParams, 'flow', profile.authentication?.flow)

		return url.toString()
	}
}

export class TrojanSerializer implements ConnectionSerializer {
	readonly protocol = 'trojan'

	serialize(profile: ConnectionProfile): string {
		assertProtocol(profile, 'trojan')
		const password = requiredAuthValue(
			profile.authentication?.password,
			'Trojan profile is missing a password',
		)
		const url = buildUrl('trojan', password, profile)
		appendTransport(url.searchParams, profile.transport)
		appendSecurity(url.searchParams, profile.security)

		return url.toString()
	}
}

export class VmessSerializer implements ConnectionSerializer {
	readonly protocol = 'vmess'

	serialize(profile: ConnectionProfile): string {
		assertProtocol(profile, 'vmess')
		const id = requiredAuthValue(
			profile.authentication?.id,
			'VMess profile is missing a user id',
		)
		const payload: Record<string, string> = {
			add: profile.endpoint.host,
			host: profile.transport?.host ?? '',
			id,
			net: profile.transport?.type ?? 'tcp',
			path: profile.transport?.path ?? '',
			port: String(profile.endpoint.port),
			ps: profile.metadata?.name ?? '',
			scy: profile.authentication?.encryption ?? '',
			sni: profile.security?.serverName ?? '',
			tls:
				profile.security && profile.security.type !== 'none'
					? profile.security.type
					: '',
			type: profile.transport?.headerType ?? 'none',
			v: '2',
		}

		if (profile.transport?.type === 'grpc') {
			payload.path = profile.transport.serviceName ?? ''
		}

		if (profile.security?.fingerprint) {
			payload.fp = profile.security.fingerprint
		}

		if (profile.security?.alpn?.length) {
			payload.alpn = profile.security.alpn.join(',')
		}

		if (profile.security?.allowInsecure) {
			payload.allowInsecure = '1'
		}

		if (profile.transport?.mux) {
			payload.mux = '1'
		}

		if (profile.transport?.packetEncoding) {
			payload.packetEncoding = profile.transport.packetEncoding
		}

		return `vmess://${encodeBase64(JSON.stringify(payload))}`
	}
}

export class ShadowsocksSerializer implements ConnectionSerializer {
	readonly protocol = 'shadowsocks'

	serialize(profile: ConnectionProfile): string {
		assertProtocol(profile, 'shadowsocks')
		const method = profile.authentication?.method
		const password = requiredAuthValue(
			profile.authentication?.password,
			'Shadowsocks profile is missing a password',
		)
		assertShadowsocksMethod(method)
		const userInfo = method.startsWith('2022-')
			? `${encodeURIComponent(method)}:${encodeURIComponent(password)}`
			: encodeBase64(`${method}:${password}`)
					.replaceAll('+', '-')
					.replaceAll('/', '_')
					.replace(/=+$/u, '')
		const host = profile.endpoint.host.includes(':')
			? `[${profile.endpoint.host.replace(/^\[|\]$/gu, '')}]`
			: profile.endpoint.host
		const name = profile.metadata?.name
			? `#${encodeURIComponent(profile.metadata.name)}`
			: ''

		return `ss://${userInfo}@${host}:${profile.endpoint.port}${name}`
	}
}

export class HysteriaSerializer implements ConnectionSerializer {
	readonly protocol = 'hysteria'

	serialize(profile: ConnectionProfile): string {
		assertProtocol(profile, 'hysteria')
		const password = requiredAuthValue(
			profile.authentication?.password,
			'Hysteria profile is missing an authentication password',
		)
		const host = profile.endpoint.host.includes(':')
			? `[${profile.endpoint.host.replace(/^\[|\]$/gu, '')}]`
			: profile.endpoint.host
		const url = new URL(`hysteria://${host}:${profile.endpoint.port}`)
		url.searchParams.set('auth', password)
		appendOptionalNumber(url.searchParams, 'upmbps', profile.hysteria?.upMbps)
		appendOptionalNumber(url.searchParams, 'downmbps', profile.hysteria?.downMbps)
		if (profile.hysteria?.obfsPassword) {
			url.searchParams.set('obfs', 'xplus')
			url.searchParams.set('obfsParam', profile.hysteria.obfsPassword)
		}
		appendTlsParameters(url.searchParams, profile.security, 'peer')
		if (profile.metadata?.name) url.hash = profile.metadata.name

		return url.toString()
	}
}

export class Hysteria2Serializer implements ConnectionSerializer {
	readonly protocol = 'hysteria2'

	serialize(profile: ConnectionProfile): string {
		assertProtocol(profile, 'hysteria2')
		const url = buildUrl(
			'hy2',
			requiredAuthValue(
				profile.authentication?.password,
				'Hysteria2 profile is missing an authentication password',
			),
			profile,
		)
		appendOptionalNumber(url.searchParams, 'upmbps', profile.hysteria?.upMbps)
		appendOptionalNumber(url.searchParams, 'downmbps', profile.hysteria?.downMbps)
		appendOptional(
			url.searchParams,
			'obfs-password',
			profile.hysteria?.obfsPassword,
		)
		appendTlsParameters(url.searchParams, profile.security)

		return url.toString()
	}
}

export class SshSerializer implements ConnectionSerializer {
	readonly protocol = 'ssh'

	serialize(profile: ConnectionProfile): string {
		assertProtocol(profile, 'ssh')
		const username = requiredAuthValue(
			profile.authentication?.username,
			'SSH profile is missing a username',
		)
		const password = requiredAuthValue(
			profile.authentication?.password,
			'SSH profile is missing a password',
		)
		const hostKey = requiredAuthValue(
			profile.authentication?.hostKey,
			'SSH profile is missing a pinned host key',
		)
		const url = buildUrl('ssh', username, profile)
		url.password = password
		url.searchParams.set('hostKey', hostKey)

		return url.toString().replaceAll('+', '%20')
	}
}

export function createProtocolRegistry() {
	return new ProtocolRegistry()
}

export const defaultProtocolRegistry = createProtocolRegistry()

export function parseConnectionUrl(
	input: string,
): readonly ConnectionProfile[] {
	return defaultProtocolRegistry.parse(input)
}

export function serializeConnectionProfile(profile: ConnectionProfile): string {
	return defaultProtocolRegistry.serialize(profile)
}

function parseUrl(
	input: string,
	protocol: Protocol,
	scheme: string = protocol,
) {
	try {
		const url = new URL(input)

		if (url.protocol !== `${scheme}:`) {
			throw new ProfileError('invalid_profile', `Expected ${protocol} URL`)
		}

		return url
	} catch (error) {
		if (error instanceof ProfileError) {
			throw error
		}

		throw new ProfileError('invalid_profile', `Malformed ${protocol} URL`)
	}
}

function assertShadowsocksMethod(
	method: string | undefined,
): asserts method is ShadowsocksMethod {
	if (!method || !SHADOWSOCKS_METHODS.includes(method as ShadowsocksMethod)) {
		throw new ProfileError(
			'invalid_profile',
			`Unsupported Shadowsocks method ${method ?? ''}`.trim(),
		)
	}
}

function decodeUrlComponent(value: string) {
	try {
		return decodeURIComponent(value)
	} catch {
		throw new ProfileError('invalid_profile', 'Malformed Shadowsocks credentials')
	}
}

function decodeShadowsocksUserInfo(value: string) {
	try {
		return decodeBase64(decodeUrlComponent(value))
	} catch (error) {
		if (error instanceof ProfileError) throw error
		throw new ProfileError('invalid_profile', 'Malformed Shadowsocks credentials')
	}
}

function endpointFromUrl(url: URL) {
	return {
		host: decodeRequired(url.hostname, 'Connection URL is missing a host'),
		port: parsePort(url.port),
	}
}

function parsePort(port: string) {
	const value = Number(port)

	if (!Number.isInteger(value) || value < 1 || value > 65535) {
		throw new ProfileError(
			'invalid_profile',
			'Connection URL has an invalid port',
		)
	}

	return value
}

function buildTransport(input: {
	readonly type?: string
	readonly host?: string
	readonly path?: string
	readonly serviceName?: string
	readonly headerType?: string
	readonly mux?: string
	readonly packetEncoding?: string
}): Transport | undefined {
	const type = normalizeTransportType(input.type)
	const headerType = parseHeaderType(input.headerType)
	const mux = parseOptionalBoolean(input.mux)
	const packetEncoding = parsePacketEncoding(input.packetEncoding)
	const hasDetails =
		Boolean(input.host) ||
		Boolean(input.path) ||
		Boolean(input.serviceName) ||
		headerType !== undefined ||
		mux !== undefined ||
		packetEncoding !== undefined

	if (!type && !hasDetails) {
		return undefined
	}

	if (type === 'tcp' && !hasDetails) {
		return undefined
	}

	return compactRecord({
		type: type ?? 'tcp',
		host: input.host,
		path: input.path,
		serviceName: input.serviceName,
		headerType,
		mux,
		packetEncoding,
	})
}

function normalizeTransportType(
	type: string | undefined,
): Transport['type'] | undefined {
	if (!type || type === 'tcp') {
		return type === 'tcp' ? 'tcp' : undefined
	}

	const normalized = type.toLowerCase()

	if (normalized === 'httpupgrade') {
		return 'httpupgrade'
	}

	if (!['ws', 'grpc', 'quic'].includes(normalized)) {
		throw new ProfileError('invalid_profile', `Unsupported transport ${type}`)
	}

	return normalized as Transport['type']
}

const SHARE_LINK_TRANSPORTS = new Set([
	'tcp',
	'ws',
	'grpc',
	'httpupgrade',
	'quic',
])

function isShareLinkTransport(value: string | undefined): boolean {
	return Boolean(value && SHARE_LINK_TRANSPORTS.has(value.toLowerCase()))
}

function parseHeaderType(value: string | undefined): Transport['headerType'] {
	if (!value || value === 'none' || isShareLinkTransport(value)) {
		return undefined
	}

	if (value !== 'http') {
		throw new ProfileError('invalid_profile', `Unsupported header type ${value}`)
	}

	return value
}

function parsePacketEncoding(
	value: string | undefined,
): Transport['packetEncoding'] {
	if (!value) {
		return undefined
	}

	if (!['none', 'packet', 'xudp'].includes(value)) {
		throw new ProfileError(
			'invalid_profile',
			`Unsupported packet encoding ${value}`,
		)
	}

	return value as Transport['packetEncoding']
}

function parseAlpn(value: string | undefined): readonly string[] | undefined {
	if (!value) {
		return undefined
	}

	const values = value
		.split(',')
		.map((item) => item.trim())
		.filter((item) => item.length > 0)

	if (values.length === 0) {
		throw new ProfileError('invalid_profile', 'ALPN must not be empty')
	}

	return values
}

function parseOptionalBoolean(value: string | undefined): boolean | undefined {
	if (value === undefined) {
		return undefined
	}

	const normalized = value.trim().toLowerCase()

	if (['1', 'true', 'yes'].includes(normalized)) {
		return true
	}

	if (['0', 'false', 'no'].includes(normalized)) {
		return false
	}

	throw new ProfileError('invalid_profile', `Invalid boolean value ${value}`)
}

function optionalBooleanString(value: unknown): string | undefined {
	if (typeof value === 'boolean' || typeof value === 'number') {
		return String(value)
	}

	return undefined
}

function compactRecord<T extends Record<string, unknown>>(input: T): T {
	return Object.fromEntries(
		Object.entries(input).filter(([, value]) => value !== undefined),
	) as T
}

function parseTransport(params: URLSearchParams): Transport | undefined {
	return buildTransport({
		type: optionalParam(params, 'type') ?? optionalParam(params, 'net'),
		host: optionalParam(params, 'host'),
		path: optionalParam(params, 'path'),
		serviceName: optionalParam(params, 'serviceName'),
		headerType: optionalParam(params, 'headerType'),
		mux: optionalParam(params, 'mux'),
		packetEncoding: optionalParam(params, 'packetEncoding'),
	})
}

function parseSecurity(
	params: URLSearchParams,
	defaultType?: Security['type'],
): Security | undefined {
	const allowInsecure = parseOptionalBoolean(
		optionalParam(params, 'allowInsecure') ?? optionalParam(params, 'insecure'),
	)
	const hintedType =
		optionalParam(params, 'security') ?? optionalParam(params, 'tls')
	const serverName =
		optionalParam(params, 'sni') ?? optionalParam(params, 'peer')
	const fingerprint = optionalParam(params, 'fp')
	const type =
		!hintedType || hintedType === 'none'
			? defaultType &&
				(defaultType === 'tls' ||
					serverName !== undefined ||
					fingerprint !== undefined ||
					allowInsecure !== undefined)
				? defaultType
				: undefined
			: hintedType

	if (!type || type === 'none') {
		return undefined
	}

	if (!['tls', 'reality'].includes(type)) {
		throw new ProfileError('invalid_profile', `Unsupported security ${type}`)
	}
	const publicKey = optionalParam(params, 'pbk')
	if (type === 'reality' && !publicKey) {
		throw new ProfileError(
			'invalid_profile',
			'REALITY security is missing a public key',
		)
	}

	return compactRecord({
		type: type as Security['type'],
		fingerprint: optionalParam(params, 'fp'),
		publicKey,
		serverName: optionalParam(params, 'sni') ?? optionalParam(params, 'peer'),
		shortId: optionalParam(params, 'sid'),
		spiderX: optionalParam(params, 'spx') ?? optionalParam(params, 'spiderX'),
		alpn: parseAlpn(optionalParam(params, 'alpn')),
		allowInsecure,
	})
}

function parseVmessTransport(
	raw: Record<string, unknown>,
): Transport | undefined {
	const net = optionalString(raw.net)
	const typeField = optionalString(raw.type)
	const type =
		normalizeTransportType(net) ??
		(isShareLinkTransport(typeField)
			? normalizeTransportType(typeField)
			: undefined)
	const path = optionalString(raw.path)

	return buildTransport({
		type,
		host: optionalString(raw.host),
		path: type === 'grpc' ? undefined : path,
		serviceName: type === 'grpc' ? path : undefined,
		headerType: isShareLinkTransport(typeField) ? undefined : typeField,
		mux: optionalString(raw.mux) ?? optionalBooleanString(raw.mux),
		packetEncoding: optionalString(raw.packetEncoding),
	})
}

function parseVmessSecurity(
	raw: Record<string, unknown>,
): Security | undefined {
	const type = optionalString(raw.tls)

	if (!type || type === 'none') {
		return undefined
	}

	if (!['tls', 'reality'].includes(type)) {
		throw new ProfileError('invalid_profile', `Unsupported security ${type}`)
	}

	return compactRecord({
		type: type as Security['type'],
		fingerprint: optionalString(raw.fp),
		serverName: optionalString(raw.sni),
		publicKey: optionalString(raw.pbk),
		shortId: optionalString(raw.sid),
		spiderX: optionalString(raw.spx) ?? optionalString(raw.spiderX),
		alpn: parseAlpn(optionalString(raw.alpn)),
		allowInsecure: parseOptionalBoolean(
			optionalString(raw.allowInsecure) ??
				optionalString(raw.insecure) ??
				optionalBooleanString(raw.allowInsecure) ??
				optionalBooleanString(raw.insecure),
		),
	})
}

function metadataFromUrl(url: URL) {
	const name = url.hash ? decodeURIComponent(url.hash.slice(1)) : undefined

	return {
		name: name || undefined,
		source: 'url' as const,
	}
}

function profileId(protocol: Protocol, host: string, port: number) {
	const safeHost = host
		.replace(/^\[|\]$/gu, '')
		.replaceAll(/[^A-Za-z0-9_.:-]/gu, '_')

	return `${protocol}:${safeHost}:${port}.${globalThis.crypto.randomUUID()}`
}

function buildUrl(
	protocol: string,
	credential: string,
	profile: ConnectionProfile,
) {
	const url = new URL(
		`${protocol}://${encodeURIComponent(credential)}@${profile.endpoint.host}:${profile.endpoint.port}`,
	)

	if (profile.metadata?.name) {
		url.hash = profile.metadata.name
	}

	return url
}

function parsePositiveNumber(params: URLSearchParams, key: string): number {
	const value = parseOptionalPositiveNumber(params, key)

	if (value === undefined) {
		throw new ProfileError('invalid_profile', `${key} is required`)
	}

	return value
}

function parseOptionalPositiveNumber(
	params: URLSearchParams,
	key: string,
): number | undefined {
	const raw = optionalParam(params, key)

	if (raw === undefined) {
		return undefined
	}

	const value = Number(raw)

	if (!Number.isFinite(value) || value <= 0 || value > 1_000_000) {
		throw new ProfileError('invalid_profile', `${key} must be a positive number`)
	}

	return value
}

function appendOptionalNumber(
	params: URLSearchParams,
	key: string,
	value?: number,
) {
	if (value !== undefined) {
		params.set(key, String(value))
	}
}

function appendTlsParameters(
	params: URLSearchParams,
	security?: Security,
	serverNameKey = 'sni',
) {
	if (security?.type !== 'tls') {
		throw new ProfileError('invalid_profile', 'Hysteria requires TLS')
	}

	appendOptional(params, serverNameKey, security.serverName)
	if (security.alpn?.length) params.set('alpn', security.alpn.join(','))
	if (security.allowInsecure) {
		params.set('insecure', '1')
	}
}

function appendTransport(params: URLSearchParams, transport?: Transport) {
	if (!transport) {
		return
	}

	params.set('type', transport.type)
	appendOptional(params, 'host', transport.host)
	appendOptional(params, 'path', transport.path)
	appendOptional(params, 'serviceName', transport.serviceName)
	appendOptional(params, 'headerType', transport.headerType)
	appendOptional(params, 'packetEncoding', transport.packetEncoding)

	if (transport.mux) {
		params.set('mux', '1')
	}
}

function appendSecurity(params: URLSearchParams, security?: Security) {
	if (!security) {
		return
	}

	params.set('security', security.type)
	appendOptional(params, 'sni', security.serverName)
	appendOptional(params, 'fp', security.fingerprint)
	appendOptional(params, 'pbk', security.publicKey)
	appendOptional(params, 'sid', security.shortId)
	appendOptional(params, 'spx', security.spiderX)
	appendOptional(params, 'alpn', security.alpn?.join(','))

	if (security.allowInsecure) {
		params.set('allowInsecure', '1')
	}
}

function appendOptional(params: URLSearchParams, key: string, value?: string) {
	if (value) {
		params.set(key, value)
	}
}

function optionalParam(params: URLSearchParams, key: string) {
	const value = params.get(key)

	return value && value.length > 0 ? value : undefined
}

function decodeRequired(value: string, message: string) {
	if (!value) {
		throw new ProfileError('invalid_profile', message)
	}

	return decodeURIComponent(value)
}

function requiredAuthValue(value: string | undefined, message: string) {
	if (!value) {
		throw new ProfileError('invalid_profile', message)
	}

	return value
}

function requireString(value: unknown, message: string) {
	const result = optionalString(value)

	if (!result) {
		throw new ProfileError('invalid_profile', message)
	}

	return result
}

function optionalString(value: unknown) {
	return typeof value === 'string' && value.length > 0 ? value : undefined
}

function assertProtocol(profile: ConnectionProfile, protocol: Protocol) {
	if (profile.protocol !== protocol) {
		throw new ProfileError('invalid_profile', `Expected ${protocol} profile`)
	}
}

const VMESS_SHARE_LINK_KEYS = new Set([
	'add',
	'aid',
	'alpn',
	'allowInsecure',
	'fp',
	'host',
	'id',
	'insecure',
	'mux',
	'net',
	'packetEncoding',
	'path',
	'pbk',
	'port',
	'ps',
	'scy',
	'sid',
	'sni',
	'spiderX',
	'spx',
	'tls',
	'type',
	'v',
])

function parseVmessPayload(payload: string) {
	try {
		const decoded = decodeBase64(payload)
		const parsed = JSON.parse(decoded)

		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new ProfileError(
				'invalid_profile',
				'VMess payload must be a JSON object',
			)
		}

		return parsed as Record<string, unknown>
	} catch (error) {
		if (error instanceof ProfileError) {
			throw error
		}

		throw new ProfileError('invalid_profile', 'Malformed VMess payload')
	}
}

function assertAllowedVmessKeys(raw: Record<string, unknown>) {
	const extra = Object.keys(raw).filter((key) => !VMESS_SHARE_LINK_KEYS.has(key))

	if (extra.length > 0) {
		throw new ProfileError(
			'invalid_profile',
			`VMess payload contains unknown fields: ${extra.join(', ')}`,
		)
	}
}

function parseVmessPort(value: unknown) {
	if (typeof value === 'number') {
		return parsePort(String(value))
	}

	return parsePort(requireString(value, 'VMess URL is missing a port'))
}

function encodeBase64(input: string) {
	const bytes = encodeUtf8(input)
	let binary = ''

	for (const byte of bytes) {
		binary += String.fromCharCode(byte)
	}

	return globalThis.btoa(binary)
}

function decodeBase64(input: string) {
	const normalized = input.replaceAll('-', '+').replaceAll('_', '/')
	const binary = globalThis.atob(normalized)
	const bytes = new Uint8Array(binary.length)

	for (let index = 0; index < binary.length; index += 1) {
		bytes[index] = binary.charCodeAt(index)
	}

	return decodeUtf8(bytes)
}

function encodeUtf8(input: string) {
	const bytes: number[] = []

	for (const symbol of input) {
		const codePoint = symbol.codePointAt(0) ?? 0

		if (codePoint <= 0x7f) {
			bytes.push(codePoint)
		} else if (codePoint <= 0x7ff) {
			bytes.push(0xc0 | (codePoint >> 6), 0x80 | (codePoint & 0x3f))
		} else if (codePoint <= 0xffff) {
			bytes.push(
				0xe0 | (codePoint >> 12),
				0x80 | ((codePoint >> 6) & 0x3f),
				0x80 | (codePoint & 0x3f),
			)
		} else {
			bytes.push(
				0xf0 | (codePoint >> 18),
				0x80 | ((codePoint >> 12) & 0x3f),
				0x80 | ((codePoint >> 6) & 0x3f),
				0x80 | (codePoint & 0x3f),
			)
		}
	}

	return bytes
}

function decodeUtf8(bytes: Uint8Array) {
	let output = ''

	for (let index = 0; index < bytes.length; index += 1) {
		const byte = bytes[index]

		if (byte === undefined) {
			throw new ProfileError('invalid_profile', 'Malformed UTF-8 in VMess payload')
		}

		if (byte < 0x80) {
			output += String.fromCodePoint(byte)
		} else if (byte >= 0xc0 && byte < 0xe0) {
			const next = requireUtf8Continuation(bytes, index + 1)
			output += String.fromCodePoint(((byte & 0x1f) << 6) | (next & 0x3f))
			index += 1
		} else if (byte >= 0xe0 && byte < 0xf0) {
			const next = requireUtf8Continuation(bytes, index + 1)
			const last = requireUtf8Continuation(bytes, index + 2)
			output += String.fromCodePoint(
				((byte & 0x0f) << 12) | ((next & 0x3f) << 6) | (last & 0x3f),
			)
			index += 2
		} else if (byte >= 0xf0 && byte < 0xf8) {
			const second = requireUtf8Continuation(bytes, index + 1)
			const third = requireUtf8Continuation(bytes, index + 2)
			const fourth = requireUtf8Continuation(bytes, index + 3)
			output += String.fromCodePoint(
				((byte & 0x07) << 18) |
					((second & 0x3f) << 12) |
					((third & 0x3f) << 6) |
					(fourth & 0x3f),
			)
			index += 3
		} else {
			throw new ProfileError('invalid_profile', 'Malformed UTF-8 in VMess payload')
		}
	}

	return output
}

function requireUtf8Continuation(bytes: Uint8Array, index: number) {
	const byte = bytes[index]

	if (byte === undefined || (byte & 0xc0) !== 0x80) {
		throw new ProfileError('invalid_profile', 'Malformed UTF-8 in VMess payload')
	}

	return byte
}
