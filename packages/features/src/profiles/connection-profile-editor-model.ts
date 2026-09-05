import type {
	ConnectionProfile,
	SecurityType,
	ShadowsocksMethod,
	TransportType,
} from '@rahrow/core/profile/connection-profile.ts'
import { parseConnectionProfile } from '@rahrow/core/profile/profile-schema.ts'
import { z } from 'zod'

import {
	optionalTextSchema,
	portTextSchema,
	positiveNumberTextSchema,
	requiredTextSchema,
} from '../forms/form-validation.ts'
import { profileFormCapability } from './profile-form-capability-matrix.ts'

export interface ConnectionProfileEditorValues {
	readonly name: string
	readonly host: string
	readonly port: string
	readonly authenticationId: string
	readonly username: string
	readonly password: string
	readonly hostKey: string
	readonly method: ShadowsocksMethod
	readonly flow: string
	readonly encryption: string
	readonly transportEnabled: boolean
	readonly transportType: TransportType
	readonly transportHost: string
	readonly transportPath: string
	readonly serviceName: string
	readonly headerType: 'none' | 'http'
	readonly mux: boolean
	readonly packetEncoding: 'none' | 'packet' | 'xudp'
	readonly securityType: SecurityType
	readonly serverName: string
	readonly fingerprint: string
	readonly publicKey: string
	readonly shortId: string
	readonly spiderX: string
	readonly alpn: string
	readonly allowInsecure: boolean
	readonly upMbps: string
	readonly downMbps: string
	readonly obfsPassword: string
}

const connectionProfileEditorBaseSchema = z.strictObject({
	name: optionalTextSchema('Remarks'),
	host: requiredTextSchema('Server'),
	port: portTextSchema,
	authenticationId: z.string(),
	username: z.string(),
	password: z.string(),
	hostKey: z.string(),
	method: z.enum([
		'aes-128-gcm',
		'aes-192-gcm',
		'aes-256-gcm',
		'chacha20-ietf-poly1305',
		'xchacha20-ietf-poly1305',
		'2022-blake3-aes-128-gcm',
		'2022-blake3-aes-256-gcm',
		'2022-blake3-chacha20-poly1305',
	]),
	flow: optionalTextSchema('Flow'),
	encryption: optionalTextSchema('Encryption'),
	transportEnabled: z.boolean(),
	transportType: z.enum(['tcp', 'ws', 'grpc', 'httpupgrade', 'quic']),
	transportHost: optionalTextSchema('Transport host'),
	transportPath: optionalTextSchema('Transport path'),
	serviceName: optionalTextSchema('Service name'),
	headerType: z.enum(['none', 'http']),
	mux: z.boolean(),
	packetEncoding: z.enum(['none', 'packet', 'xudp']),
	securityType: z.enum(['none', 'tls', 'reality']),
	serverName: optionalTextSchema('TLS server name'),
	fingerprint: optionalTextSchema('Fingerprint'),
	publicKey: optionalTextSchema('REALITY public key'),
	shortId: optionalTextSchema('REALITY short ID'),
	spiderX: optionalTextSchema('REALITY spider path'),
	alpn: optionalTextSchema('ALPN'),
	allowInsecure: z.boolean(),
	upMbps: z.string(),
	downMbps: z.string(),
	obfsPassword: optionalTextSchema('Obfuscation password'),
})

export function connectionProfileEditorFormSchema(
	profile: ConnectionProfile,
): z.ZodType<ConnectionProfileEditorValues, ConnectionProfileEditorValues> {
	return connectionProfileEditorBaseSchema.superRefine((values, context) => {
		const requireField = (
			path: 'authenticationId' | 'username' | 'password' | 'hostKey',
			label: string,
		) => {
			if (!values[path].trim()) {
				context.addIssue({
					code: 'custom',
					path: [path],
					message: `${label} is required`,
				})
			}
		}

		switch (profile.protocol) {
			case 'vless':
			case 'vmess':
				requireField('authenticationId', 'User ID')
				break
			case 'trojan':
			case 'hysteria':
			case 'hysteria2':
				requireField('password', 'Password')
				break
			case 'shadowsocks':
				requireField('password', 'Password or key')
				break
			case 'ssh':
				requireField('username', 'Username')
				requireField('password', 'Password')
				requireField('hostKey', 'Pinned host key')
				break
		}

		if (profile.protocol === 'hysteria' || profile.protocol === 'hysteria2') {
			for (const [path, label] of [
				['upMbps', 'Upload Mbps'],
				['downMbps', 'Download Mbps'],
			] as const) {
				const result = positiveNumberTextSchema(
					label,
					profile.protocol === 'hysteria2',
				).safeParse(values[path])
				if (!result.success) {
					context.addIssue({
						code: 'custom',
						path: [path],
						message: result.error.issues[0]?.message ?? `${label} is invalid`,
					})
				}
			}
		}
	})
}

export function profileSupportsTransport(profile: ConnectionProfile): boolean {
	return profileFormCapability(profile.protocol).transports.length > 0
}

export function profileSupportsSecurity(profile: ConnectionProfile): boolean {
	return profileFormCapability(profile.protocol).security.some(
		(security) => security !== 'none',
	)
}

export function toConnectionProfileEditorValues(
	profile: ConnectionProfile,
): ConnectionProfileEditorValues {
	return {
		name: profile.metadata?.name ?? '',
		host: profile.endpoint.host,
		port: String(profile.endpoint.port),
		authenticationId: profile.authentication?.id ?? '',
		username: profile.authentication?.username ?? '',
		password: profile.authentication?.password ?? '',
		hostKey: profile.authentication?.hostKey ?? '',
		method: profile.authentication?.method ?? 'aes-256-gcm',
		flow: profile.authentication?.flow ?? '',
		encryption: profile.authentication?.encryption ?? '',
		transportEnabled: Boolean(profile.transport),
		transportType: profile.transport?.type ?? 'tcp',
		transportHost: profile.transport?.host ?? '',
		transportPath: profile.transport?.path ?? '',
		serviceName: profile.transport?.serviceName ?? '',
		headerType: profile.transport?.headerType ?? 'none',
		mux: profile.transport?.mux ?? false,
		packetEncoding: profile.transport?.packetEncoding ?? 'none',
		securityType:
			profile.protocol === 'hysteria' || profile.protocol === 'hysteria2'
				? 'tls'
				: (profile.security?.type ?? 'none'),
		serverName: profile.security?.serverName ?? '',
		fingerprint: profile.security?.fingerprint ?? '',
		publicKey: profile.security?.publicKey ?? '',
		shortId: profile.security?.shortId ?? '',
		spiderX: profile.security?.spiderX ?? '',
		alpn: profile.security?.alpn?.join(', ') ?? '',
		allowInsecure: profile.security?.allowInsecure ?? false,
		upMbps: profile.hysteria?.upMbps ? String(profile.hysteria.upMbps) : '',
		downMbps: profile.hysteria?.downMbps ? String(profile.hysteria.downMbps) : '',
		obfsPassword: profile.hysteria?.obfsPassword ?? '',
	}
}

export function buildEditedConnectionProfile(
	profile: ConnectionProfile,
	values: ConnectionProfileEditorValues,
): ConnectionProfile {
	const host = required(values.host, 'Server is required')
	const port = numberInRange(values.port, 'Port', 1, 65_535)
	const metadata = compactRecord({
		...profile.metadata,
		name: optional(values.name),
	})
	const authentication = buildAuthentication(profile, values)
	const transport = buildTransport(profile, values)
	const security = buildSecurity(profile, values)
	const hysteria = buildHysteria(profile, values)

	return parseConnectionProfile({
		...profile,
		endpoint: { host, port },
		...(Object.keys(metadata).length > 0
			? { metadata }
			: { metadata: undefined }),
		...(authentication ? { authentication } : { authentication: undefined }),
		...(transport ? { transport } : { transport: undefined }),
		...(security ? { security } : { security: undefined }),
		...(hysteria ? { hysteria } : { hysteria: undefined }),
	})
}

export function parseCanonicalProfileJson(
	input: string,
	expectedProfile: ConnectionProfile,
): ConnectionProfile {
	let parsed: unknown

	try {
		parsed = JSON.parse(input)
	} catch {
		throw new Error('Canonical profile JSON is not valid JSON')
	}

	let profile: ConnectionProfile
	try {
		profile = parseConnectionProfile(parsed)
	} catch (error) {
		throw new Error(
			`Invalid profile: ${error instanceof Error ? error.message : 'schema validation failed'}`,
			{ cause: error },
		)
	}

	if (profile.id !== expectedProfile.id) {
		throw new Error('Profile identity cannot be changed in the editor')
	}

	if (profile.protocol !== expectedProfile.protocol) {
		throw new Error(
			'Protocol changes are not supported because they can discard connection data',
		)
	}

	return profile
}

export function formatCanonicalProfileJson(profile: ConnectionProfile): string {
	return JSON.stringify(profile, null, 2)
}

export interface CanonicalProfileChangePreview {
	readonly profile: ConnectionProfile
	readonly changedPaths: readonly string[]
}

export function previewCanonicalProfileJsonChange(
	input: string,
	expectedProfile: ConnectionProfile,
): CanonicalProfileChangePreview {
	const profile = parseCanonicalProfileJson(input, expectedProfile)
	return {
		profile,
		changedPaths: changedJsonPaths(expectedProfile, profile),
	}
}

function changedJsonPaths(
	before: unknown,
	after: unknown,
	path = '$',
): string[] {
	if (Object.is(before, after)) return []
	if (Array.isArray(before) && Array.isArray(after)) {
		const paths: string[] = []
		for (
			let index = 0;
			index < Math.max(before.length, after.length);
			index += 1
		) {
			paths.push(
				...changedJsonPaths(before[index], after[index], `${path}[${index}]`),
			)
		}
		return paths
	}
	if (isJsonRecord(before) && isJsonRecord(after)) {
		const paths: string[] = []
		const keys = new Set([...Object.keys(before), ...Object.keys(after)])
		for (const key of [...keys].sort()) {
			paths.push(...changedJsonPaths(before[key], after[key], `${path}.${key}`))
		}
		return paths
	}
	return [path]
}

function isJsonRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function buildAuthentication(
	profile: ConnectionProfile,
	values: ConnectionProfileEditorValues,
) {
	switch (profile.protocol) {
		case 'vless':
		case 'vmess':
			return compactRecord({
				...profile.authentication,
				id: required(values.authenticationId, 'User ID is required'),
				flow: optional(values.flow),
				encryption: optional(values.encryption),
			})
		case 'trojan':
			return compactRecord({
				...profile.authentication,
				password: required(values.password, 'Password is required'),
			})
		case 'shadowsocks':
			return {
				method: values.method,
				password: required(values.password, 'Password or key is required'),
			}
		case 'hysteria':
		case 'hysteria2':
			return {
				password: required(values.password, 'Password is required'),
			}
		case 'ssh':
			return {
				username: required(values.username, 'Username is required'),
				password: required(values.password, 'Password is required'),
				hostKey: required(values.hostKey, 'Pinned host key is required'),
			}
	}
}

function buildTransport(
	profile: ConnectionProfile,
	values: ConnectionProfileEditorValues,
) {
	if (!profileSupportsTransport(profile) || !values.transportEnabled) {
		return undefined
	}

	return compactRecord({
		type: values.transportType,
		host:
			values.transportType === 'ws' || values.transportType === 'httpupgrade'
				? optional(values.transportHost)
				: undefined,
		path:
			values.transportType === 'ws' || values.transportType === 'httpupgrade'
				? optional(values.transportPath)
				: undefined,
		serviceName:
			values.transportType === 'grpc' ? optional(values.serviceName) : undefined,
		headerType: values.transportType === 'tcp' ? values.headerType : undefined,
		mux: values.mux || undefined,
		packetEncoding:
			values.packetEncoding === 'none' ? undefined : values.packetEncoding,
	})
}

function buildSecurity(
	profile: ConnectionProfile,
	values: ConnectionProfileEditorValues,
) {
	if (!profileSupportsSecurity(profile)) {
		return undefined
	}

	const type =
		profile.protocol === 'hysteria' || profile.protocol === 'hysteria2'
			? 'tls'
			: values.securityType

	if (type === 'none' && !profile.security) {
		return undefined
	}

	return compactRecord({
		type,
		serverName: type === 'none' ? undefined : optional(values.serverName),
		fingerprint: type === 'none' ? undefined : optional(values.fingerprint),
		publicKey: type === 'reality' ? optional(values.publicKey) : undefined,
		shortId: type === 'reality' ? optional(values.shortId) : undefined,
		spiderX: type === 'reality' ? optional(values.spiderX) : undefined,
		alpn: type === 'none' ? undefined : commaSeparated(values.alpn),
		allowInsecure:
			type === 'none' ? undefined : values.allowInsecure || undefined,
	})
}

function buildHysteria(
	profile: ConnectionProfile,
	values: ConnectionProfileEditorValues,
) {
	if (profile.protocol !== 'hysteria' && profile.protocol !== 'hysteria2') {
		return undefined
	}

	return compactRecord({
		upMbps:
			profile.protocol === 'hysteria'
				? positiveNumber(values.upMbps, 'Upload Mbps')
				: optionalPositiveNumber(values.upMbps, 'Upload Mbps'),
		downMbps:
			profile.protocol === 'hysteria'
				? positiveNumber(values.downMbps, 'Download Mbps')
				: optionalPositiveNumber(values.downMbps, 'Download Mbps'),
		obfsPassword: optional(values.obfsPassword),
	})
}

function required(value: string, message: string): string {
	const normalized = value.trim()

	if (!normalized) {
		throw new Error(message)
	}

	return normalized
}

function optional(value: string): string | undefined {
	return value.trim() || undefined
}

function commaSeparated(value: string): readonly string[] | undefined {
	const values = value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean)

	return values.length > 0 ? values : undefined
}

function numberInRange(
	value: string,
	label: string,
	minimum: number,
	maximum: number,
): number {
	const number = Number(value)

	if (!Number.isInteger(number) || number < minimum || number > maximum) {
		throw new Error(`${label} must be between ${minimum} and ${maximum}`)
	}

	return number
}

function positiveNumber(value: string, label: string): number {
	const number = Number(value)

	if (!Number.isFinite(number) || number <= 0) {
		throw new Error(`${label} must be greater than zero`)
	}

	return number
}

function optionalPositiveNumber(
	value: string,
	label: string,
): number | undefined {
	return value.trim() ? positiveNumber(value, label) : undefined
}

function compactRecord<T extends Record<string, unknown>>(
	record: T,
): { [K in keyof T]?: Exclude<T[K], undefined> } {
	return Object.fromEntries(
		Object.entries(record).filter(([, value]) => value !== undefined),
	) as { [K in keyof T]?: Exclude<T[K], undefined> }
}
