import type {
	ConnectionProfile,
	Security,
	Transport,
} from '@rahrow/core/profile/connection-profile.ts'
import { parseConnectionProfile } from '@rahrow/core/profile/profile-schema.ts'
import type {
	ConversionResult,
	RawEngineDocumentAdapter,
	RawOutboundCandidate,
	RawProfileIdentity,
} from '@rahrow/core/profile/raw-engine-document.ts'

type JsonRecord = Record<string, unknown>

const MAX_RAW_DOCUMENT_LENGTH = 5_000_000
const XRAY_PROTOCOLS = new Set(['vless', 'vmess', 'trojan', 'shadowsocks'])
const SING_BOX_PROTOCOLS = new Set([
	'vless',
	'vmess',
	'trojan',
	'shadowsocks',
	'hysteria',
	'hysteria2',
	'ssh',
])

export class XrayRawDocumentAdapter implements RawEngineDocumentAdapter {
	readonly engineId = 'xray' as const

	constructor(readonly engineVersion: string) {
		assertVersion(engineVersion)
	}

	validate(rawDocument: string): JsonRecord {
		return validateRawDocument(rawDocument, 'Xray')
	}

	listExtractableOutbounds(document: unknown): readonly RawOutboundCandidate[] {
		return candidates(document, 'protocol', XRAY_PROTOCOLS)
	}

	extractOutbound(
		document: unknown,
		candidateId: string,
		identity: RawProfileIdentity,
	): ConversionResult<ConnectionProfile> {
		const root = validatedRoot(document, 'Xray')
		const { outbound, index } = selectedOutbound(
			root,
			candidateId,
			'protocol',
			XRAY_PROTOCOLS,
		)
		const consumed = new Set<string>([
			`$.outbounds[${index}].protocol`,
			`$.outbounds[${index}].tag`,
		])
		const profile = xrayOutboundToProfile(outbound, index, identity, consumed)

		return conversionResult(root, index, profile, consumed)
	}
}

export class SingBoxRawDocumentAdapter implements RawEngineDocumentAdapter {
	readonly engineId = 'sing-box' as const

	constructor(readonly engineVersion: string) {
		assertVersion(engineVersion)
	}

	validate(rawDocument: string): JsonRecord {
		return validateRawDocument(rawDocument, 'sing-box')
	}

	listExtractableOutbounds(document: unknown): readonly RawOutboundCandidate[] {
		return candidates(document, 'type', SING_BOX_PROTOCOLS)
	}

	extractOutbound(
		document: unknown,
		candidateId: string,
		identity: RawProfileIdentity,
	): ConversionResult<ConnectionProfile> {
		const root = validatedRoot(document, 'sing-box')
		const { outbound, index } = selectedOutbound(
			root,
			candidateId,
			'type',
			SING_BOX_PROTOCOLS,
		)
		const consumed = new Set<string>([
			`$.outbounds[${index}].type`,
			`$.outbounds[${index}].tag`,
		])
		const profile = singBoxOutboundToProfile(outbound, index, identity, consumed)

		return conversionResult(root, index, profile, consumed)
	}
}

function xrayOutboundToProfile(
	outbound: JsonRecord,
	index: number,
	identity: RawProfileIdentity,
	consumed: Set<string>,
): ConnectionProfile {
	const base = `$.outbounds[${index}]`
	const protocol = requiredString(
		outbound.protocol,
		'Selected Xray outbound protocol is invalid',
	)
	const settings = record(
		outbound.settings,
		'Selected Xray outbound settings are invalid',
	)
	let endpoint: JsonRecord
	let user: JsonRecord

	if (protocol === 'vless' || protocol === 'vmess') {
		endpoint = firstRecord(
			settings.vnext,
			'Selected Xray outbound requires one server',
		)
		user = firstRecord(endpoint.users, 'Selected Xray outbound requires one user')
		consume(consumed, base, [
			'settings.vnext[0].address',
			'settings.vnext[0].port',
			'settings.vnext[0].users[0].id',
		])
	} else {
		endpoint = firstRecord(
			settings.servers,
			'Selected Xray outbound requires one server',
		)
		user = endpoint
		consume(consumed, base, [
			'settings.servers[0].address',
			'settings.servers[0].port',
		])
	}

	const authentication: JsonRecord = {}
	if (protocol === 'vless' || protocol === 'vmess') {
		authentication.id = requiredString(
			user.id,
			'Selected Xray outbound user id is invalid',
		)
		if (typeof user.encryption === 'string') {
			authentication.encryption = user.encryption
			consumed.add(`${base}.settings.vnext[0].users[0].encryption`)
		}
		if (typeof user.flow === 'string') {
			authentication.flow = user.flow
			consumed.add(`${base}.settings.vnext[0].users[0].flow`)
		}
	} else if (protocol === 'shadowsocks') {
		authentication.method = requiredString(
			user.method,
			'Selected Xray Shadowsocks method is invalid',
		)
		authentication.password = requiredString(
			user.password,
			'Selected Xray Shadowsocks credential is invalid',
		)
		consume(consumed, base, [
			'settings.servers[0].method',
			'settings.servers[0].password',
		])
	} else {
		authentication.password = requiredString(
			user.password,
			'Selected Xray Trojan credential is invalid',
		)
		consumed.add(`${base}.settings.servers[0].password`)
	}

	return parseConnectionProfile({
		id: identity.id,
		protocol,
		endpoint: {
			host: requiredString(
				endpoint.address,
				'Selected Xray server address is invalid',
			),
			port: requiredPort(endpoint.port, 'Selected Xray server port is invalid'),
		},
		authentication,
		...xrayStreamFields(outbound, base, consumed),
		metadata: metadata(outbound.tag, identity),
	})
}

function xrayStreamFields(
	outbound: JsonRecord,
	base: string,
	consumed: Set<string>,
): { readonly transport?: Transport; readonly security?: Security } {
	if (!isRecord(outbound.streamSettings)) return {}
	const stream = outbound.streamSettings
	const network = typeof stream.network === 'string' ? stream.network : undefined
	let transport: Transport | undefined

	if (
		network &&
		['tcp', 'ws', 'grpc', 'httpupgrade', 'quic'].includes(network)
	) {
		consumed.add(`${base}.streamSettings.network`)
		const detailsKey =
			network === 'ws'
				? 'wsSettings'
				: network === 'grpc'
					? 'grpcSettings'
					: network === 'httpupgrade'
						? 'httpupgradeSettings'
						: network === 'tcp'
							? 'tcpSettings'
							: undefined
		const details =
			detailsKey && isRecord(stream[detailsKey]) ? stream[detailsKey] : {}
		const host =
			typeof details.host === 'string'
				? details.host
				: isRecord(details.headers) && typeof details.headers.Host === 'string'
					? details.headers.Host
					: undefined
		const path = typeof details.path === 'string' ? details.path : undefined
		const serviceName =
			typeof details.serviceName === 'string' ? details.serviceName : undefined
		const header = isRecord(details.header) ? details.header : undefined
		const headerType = header?.type === 'http' ? 'http' : undefined
		if (detailsKey && host) {
			consumed.add(
				`${base}.streamSettings.${detailsKey}.${typeof details.host === 'string' ? 'host' : 'headers.Host'}`,
			)
		}
		if (detailsKey && path)
			consumed.add(`${base}.streamSettings.${detailsKey}.path`)
		if (detailsKey && serviceName)
			consumed.add(`${base}.streamSettings.${detailsKey}.serviceName`)
		if (detailsKey && headerType)
			consumed.add(`${base}.streamSettings.${detailsKey}.header.type`)
		transport = {
			type: network as Transport['type'],
			...(host ? { host } : {}),
			...(path ? { path } : {}),
			...(serviceName ? { serviceName } : {}),
			...(headerType ? { headerType } : {}),
			...(isRecord(outbound.mux) && outbound.mux.enabled === true
				? { mux: true }
				: {}),
		}
		if (transport.mux) consumed.add(`${base}.mux.enabled`)
	}

	const securityType = stream.security
	if (securityType !== 'tls' && securityType !== 'reality') {
		return transport ? { transport } : {}
	}
	consumed.add(`${base}.streamSettings.security`)
	const securityKey = securityType === 'tls' ? 'tlsSettings' : 'realitySettings'
	const details = isRecord(stream[securityKey]) ? stream[securityKey] : {}
	const security: Security = {
		type: securityType,
		...optionalStringField(
			details,
			'serverName',
			consumed,
			`${base}.streamSettings.${securityKey}`,
		),
		...optionalStringField(
			details,
			'fingerprint',
			consumed,
			`${base}.streamSettings.${securityKey}`,
		),
		...optionalStringField(
			details,
			'publicKey',
			consumed,
			`${base}.streamSettings.${securityKey}`,
		),
		...optionalStringField(
			details,
			'shortId',
			consumed,
			`${base}.streamSettings.${securityKey}`,
		),
		...optionalStringField(
			details,
			'spiderX',
			consumed,
			`${base}.streamSettings.${securityKey}`,
		),
		...(Array.isArray(details.alpn) &&
		details.alpn.every((item) => typeof item === 'string')
			? { alpn: details.alpn as string[] }
			: {}),
		...(details.allowInsecure === true ? { allowInsecure: true } : {}),
	}
	if (security.alpn) {
		for (let i = 0; i < security.alpn.length; i += 1)
			consumed.add(`${base}.streamSettings.${securityKey}.alpn[${i}]`)
	}
	if (security.allowInsecure)
		consumed.add(`${base}.streamSettings.${securityKey}.allowInsecure`)

	return { ...(transport ? { transport } : {}), security }
}

function singBoxOutboundToProfile(
	outbound: JsonRecord,
	index: number,
	identity: RawProfileIdentity,
	consumed: Set<string>,
): ConnectionProfile {
	const base = `$.outbounds[${index}]`
	const protocol = requiredString(
		outbound.type,
		'Selected sing-box outbound type is invalid',
	)
	consume(consumed, base, ['server', 'server_port'])
	const authentication: JsonRecord = {}

	if (protocol === 'vless' || protocol === 'vmess') {
		authentication.id = requiredString(
			outbound.uuid,
			'Selected sing-box UUID is invalid',
		)
		consumed.add(`${base}.uuid`)
		if (typeof outbound.flow === 'string') {
			authentication.flow = outbound.flow
			consumed.add(`${base}.flow`)
		}
		if (typeof outbound.security === 'string') {
			authentication.encryption = outbound.security
			consumed.add(`${base}.security`)
		}
	} else if (protocol === 'ssh') {
		authentication.username = requiredString(
			outbound.user,
			'Selected sing-box SSH user is invalid',
		)
		authentication.password = requiredString(
			outbound.password,
			'Selected sing-box SSH credential is invalid',
		)
		const hostKeys = Array.isArray(outbound.host_key) ? outbound.host_key : []
		authentication.hostKey = requiredString(
			hostKeys[0],
			'Selected sing-box SSH host key is invalid',
		)
		consume(consumed, base, ['user', 'password', 'host_key[0]'])
	} else {
		authentication.password = requiredString(
			outbound.password ?? outbound.auth_str,
			'Selected sing-box credential is invalid',
		)
		consumed.add(
			`${base}.${typeof outbound.password === 'string' ? 'password' : 'auth_str'}`,
		)
		if (protocol === 'shadowsocks') {
			authentication.method = requiredString(
				outbound.method,
				'Selected sing-box Shadowsocks method is invalid',
			)
			consumed.add(`${base}.method`)
		}
	}

	const transport = singBoxTransport(outbound, base, consumed)
	const security = singBoxSecurity(outbound, base, consumed)
	const hysteria =
		protocol === 'hysteria' || protocol === 'hysteria2'
			? compact({
					upMbps: optionalPositiveNumber(outbound.up_mbps),
					downMbps: optionalPositiveNumber(outbound.down_mbps),
					obfsPassword:
						typeof outbound.obfs === 'string'
							? outbound.obfs
							: isRecord(outbound.obfs) && typeof outbound.obfs.password === 'string'
								? outbound.obfs.password
								: undefined,
				})
			: undefined
	for (const key of ['up_mbps', 'down_mbps'] as const) {
		if (typeof outbound[key] === 'number') consumed.add(`${base}.${key}`)
	}
	if (typeof outbound.obfs === 'string') consumed.add(`${base}.obfs`)
	if (isRecord(outbound.obfs) && typeof outbound.obfs.password === 'string') {
		consumed.add(`${base}.obfs.password`)
		if (typeof outbound.obfs.type === 'string') consumed.add(`${base}.obfs.type`)
	}

	return parseConnectionProfile({
		id: identity.id,
		protocol,
		endpoint: {
			host: requiredString(outbound.server, 'Selected sing-box server is invalid'),
			port: requiredPort(
				outbound.server_port,
				'Selected sing-box port is invalid',
			),
		},
		authentication,
		...(transport ? { transport } : {}),
		...(security ? { security } : {}),
		...(hysteria && Object.keys(hysteria).length > 0 ? { hysteria } : {}),
		metadata: metadata(outbound.tag, identity),
	})
}

function singBoxTransport(
	outbound: JsonRecord,
	base: string,
	consumed: Set<string>,
): Transport | undefined {
	if (!isRecord(outbound.transport)) return undefined
	const raw = outbound.transport
	const type = raw.type
	if (type !== 'ws' && type !== 'grpc' && type !== 'httpupgrade')
		return undefined
	consumed.add(`${base}.transport.type`)
	const host =
		typeof raw.host === 'string'
			? raw.host
			: isRecord(raw.headers) && typeof raw.headers.Host === 'string'
				? raw.headers.Host
				: undefined
	const path = typeof raw.path === 'string' ? raw.path : undefined
	const serviceName =
		typeof raw.service_name === 'string' ? raw.service_name : undefined
	if (host)
		consumed.add(
			`${base}.transport.${typeof raw.host === 'string' ? 'host' : 'headers.Host'}`,
		)
	if (path) consumed.add(`${base}.transport.path`)
	if (serviceName) consumed.add(`${base}.transport.service_name`)
	return {
		type,
		...(host ? { host } : {}),
		...(path ? { path } : {}),
		...(serviceName ? { serviceName } : {}),
	}
}

function singBoxSecurity(
	outbound: JsonRecord,
	base: string,
	consumed: Set<string>,
): Security | undefined {
	if (!isRecord(outbound.tls) || outbound.tls.enabled !== true) return undefined
	const tls = outbound.tls
	consumed.add(`${base}.tls.enabled`)
	const reality =
		isRecord(tls.reality) && tls.reality.enabled === true
			? tls.reality
			: undefined
	if (reality) consumed.add(`${base}.tls.reality.enabled`)
	const security: Security = {
		type: reality ? 'reality' : 'tls',
		...(typeof tls.server_name === 'string'
			? { serverName: tls.server_name }
			: {}),
		...(isRecord(tls.utls) && typeof tls.utls.fingerprint === 'string'
			? { fingerprint: tls.utls.fingerprint }
			: {}),
		...(reality && typeof reality.public_key === 'string'
			? { publicKey: reality.public_key }
			: {}),
		...(reality && typeof reality.short_id === 'string'
			? { shortId: reality.short_id }
			: {}),
		...(Array.isArray(tls.alpn) &&
		tls.alpn.every((entry) => typeof entry === 'string')
			? { alpn: tls.alpn as string[] }
			: {}),
		...(tls.insecure === true ? { allowInsecure: true } : {}),
	}
	if (security.serverName) consumed.add(`${base}.tls.server_name`)
	if (security.fingerprint) {
		consumed.add(`${base}.tls.utls.fingerprint`)
		if (isRecord(tls.utls) && tls.utls.enabled === true)
			consumed.add(`${base}.tls.utls.enabled`)
	}
	if (security.publicKey) consumed.add(`${base}.tls.reality.public_key`)
	if (security.shortId) consumed.add(`${base}.tls.reality.short_id`)
	if (security.alpn) {
		for (let i = 0; i < security.alpn.length; i += 1)
			consumed.add(`${base}.tls.alpn[${i}]`)
	}
	if (security.allowInsecure) consumed.add(`${base}.tls.insecure`)
	return security
}

function conversionResult(
	root: JsonRecord,
	selectedIndex: number,
	profile: ConnectionProfile,
	consumed: ReadonlySet<string>,
): ConversionResult<ConnectionProfile> {
	const unrepresentedFields = leafPaths(root).filter(
		(path) => !consumed.has(path),
	)
	const warnings = unrepresentedFields.map((path) => ({
		path,
		code: path.startsWith(`$.outbounds[${selectedIndex}]`)
			? 'engine-only-field'
			: path.startsWith('$.outbounds[')
				? 'additional-outbound'
				: 'ignored-document-field',
		message: path.startsWith(`$.outbounds[${selectedIndex}]`)
			? 'The selected outbound field is not represented by a canonical profile.'
			: path.startsWith('$.outbounds[')
				? 'An additional outbound remains only in the preserved raw document.'
				: 'This engine document field remains only in the preserved raw document.',
	}))

	return {
		value: profile,
		fidelity: unrepresentedFields.length > 0 ? 'lossy' : 'normalized',
		warnings,
		unrepresentedFields,
	}
}

function validateRawDocument(
	rawDocument: string,
	engineName: string,
): JsonRecord {
	if (rawDocument.length > MAX_RAW_DOCUMENT_LENGTH) {
		throw new Error(`${engineName} document exceeds the 5 MB safety limit`)
	}
	let parsed: unknown
	try {
		parsed = JSON.parse(rawDocument)
	} catch {
		throw new Error(`${engineName} document is not valid JSON`)
	}
	return validatedRoot(parsed, engineName)
}

function validatedRoot(document: unknown, engineName: string): JsonRecord {
	const root = record(document, `${engineName} document must be an object`)
	if (!Array.isArray(root.outbounds)) {
		throw new Error(`${engineName} document requires an outbounds array`)
	}
	root.outbounds.forEach((outbound, index) => {
		record(outbound, `${engineName} outbound ${index} must be an object`)
	})
	return root
}

function candidates(
	document: unknown,
	protocolKey: 'protocol' | 'type',
	supported: ReadonlySet<string>,
): readonly RawOutboundCandidate[] {
	const root = record(document, 'Validated raw document is invalid')
	const outbounds = Array.isArray(root.outbounds) ? root.outbounds : []
	return outbounds.flatMap((value, index) => {
		if (!isRecord(value) || typeof value[protocolKey] !== 'string') return []
		const protocol = value[protocolKey]
		if (!supported.has(protocol)) return []
		return [
			{
				id: `outbound:${index}`,
				index,
				protocol,
				label:
					typeof value.tag === 'string' && value.tag.trim()
						? value.tag
						: `${protocol} #${index + 1}`,
			},
		]
	})
}

function selectedOutbound(
	root: JsonRecord,
	candidateId: string,
	protocolKey: 'protocol' | 'type',
	supported: ReadonlySet<string>,
): { readonly outbound: JsonRecord; readonly index: number } {
	const match = /^outbound:(\d+)$/u.exec(candidateId)
	if (!match) throw new Error('Select one supported outbound before extraction')
	const index = Number(match[1])
	const outbounds = root.outbounds as unknown[]
	const outbound = record(outbounds[index], 'Selected outbound does not exist')
	if (
		typeof outbound[protocolKey] !== 'string' ||
		!supported.has(outbound[protocolKey])
	) {
		throw new Error('Selected outbound is not supported by RahRow')
	}
	return { outbound, index }
}

function metadata(tag: unknown, identity: RawProfileIdentity) {
	return compact({
		name:
			identity.name?.trim() ||
			(typeof tag === 'string' && tag.trim() ? tag.trim() : undefined),
		source: 'file' as const,
		tags: identity.tags,
		subscriptionId: identity.subscriptionId,
	})
}

function leafPaths(value: unknown, path = '$'): string[] {
	if (Array.isArray(value)) {
		if (value.length === 0) return [path]
		return value.flatMap((entry, index) => leafPaths(entry, `${path}[${index}]`))
	}
	if (isRecord(value)) {
		const entries = Object.entries(value)
		if (entries.length === 0) return [path]
		return entries.flatMap(([key, entry]) => leafPaths(entry, `${path}.${key}`))
	}
	return [path]
}

function optionalStringField(
	recordValue: JsonRecord,
	key: 'serverName' | 'fingerprint' | 'publicKey' | 'shortId' | 'spiderX',
	consumed: Set<string>,
	base: string,
): Partial<Security> {
	const value = recordValue[key]
	if (typeof value !== 'string' || !value) return {}
	consumed.add(`${base}.${key}`)
	return { [key]: value }
}

function consume(
	consumed: Set<string>,
	base: string,
	paths: readonly string[],
) {
	for (const path of paths) consumed.add(`${base}.${path}`)
}

function compact<T extends JsonRecord>(value: T): JsonRecord {
	return Object.fromEntries(
		Object.entries(value).filter(([, entry]) => entry !== undefined),
	)
}

function optionalPositiveNumber(value: unknown): number | undefined {
	return typeof value === 'number' && Number.isFinite(value) && value > 0
		? value
		: undefined
}

function requiredPort(value: unknown, message: string): number {
	if (
		!Number.isInteger(value) ||
		(value as number) < 1 ||
		(value as number) > 65_535
	) {
		throw new Error(message)
	}
	return value as number
}

function requiredString(value: unknown, message: string): string {
	if (typeof value !== 'string' || !value.trim()) throw new Error(message)
	return value
}

function firstRecord(value: unknown, message: string): JsonRecord {
	if (!Array.isArray(value) || value.length === 0) throw new Error(message)
	return record(value[0], message)
}

function record(value: unknown, message: string): JsonRecord {
	if (!isRecord(value)) throw new Error(message)
	return value
}

function isRecord(value: unknown): value is JsonRecord {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function assertVersion(version: string) {
	if (!version.trim()) throw new Error('Pinned engine version is required')
}
