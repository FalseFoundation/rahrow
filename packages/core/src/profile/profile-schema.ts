import { z } from 'zod'

import { ProfileError } from '../errors.ts'
import type { Settings } from '../storage/json-store.ts'
import { SHADOWSOCKS_METHODS } from './connection-profile.ts'

const textSchema = z.string().trim().min(1).max(512)
const networkTextSchema = textSchema.regex(
	/^[^\s\p{Cc}\p{Cf}]+$/u,
	'Must not contain whitespace or control characters',
)
const uuidSchema = textSchema.regex(
	/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu,
	'Must be a UUID',
)

export const endpointSchema = z.strictObject({
	host: networkTextSchema.max(253),
	port: z.number().int().min(1).max(65535),
})

export const transportSchema = z.strictObject({
	type: z.enum(['tcp', 'ws', 'grpc', 'httpupgrade', 'quic']),
	path: textSchema.optional(),
	host: networkTextSchema.optional(),
	serviceName: textSchema.optional(),
	headerType: z.enum(['none', 'http']).optional(),
	mux: z.boolean().optional(),
	packetEncoding: z.enum(['none', 'packet', 'xudp']).optional(),
})

export const securitySchema = z.strictObject({
	type: z.enum(['none', 'tls', 'reality']),
	serverName: networkTextSchema.optional(),
	fingerprint: networkTextSchema.optional(),
	publicKey: textSchema.optional(),
	shortId: networkTextSchema.optional(),
	spiderX: textSchema.optional(),
	alpn: z.array(textSchema).min(1).readonly().optional(),
	allowInsecure: z.boolean().optional(),
})

export const authenticationSchema = z.strictObject({
	id: uuidSchema.optional(),
	username: textSchema.optional(),
	password: textSchema.optional(),
	hostKey: textSchema.optional(),
	method: z.enum(SHADOWSOCKS_METHODS).optional(),
	flow: textSchema.optional(),
	encryption: textSchema.optional(),
})

export const hysteriaOptionsSchema = z.strictObject({
	upMbps: z.number().positive().max(1_000_000).optional(),
	downMbps: z.number().positive().max(1_000_000).optional(),
	obfsPassword: textSchema.optional(),
})

export const profileMetadataSchema = z.strictObject({
	name: textSchema.optional(),
	source: z
		.enum(['manual', 'url', 'subscription', 'clipboard', 'share', 'qr', 'file'])
		.optional(),
	tags: z.array(textSchema).readonly().optional(),
	subscriptionId: textSchema.optional(),
})

export const connectionProfileSchema = z
	.strictObject({
		id: textSchema,
		protocol: z.enum([
			'vless',
			'vmess',
			'trojan',
			'shadowsocks',
			'hysteria',
			'hysteria2',
			'ssh',
		]),
		endpoint: endpointSchema,
		transport: transportSchema.optional(),
		security: securitySchema.optional(),
		authentication: authenticationSchema.optional(),
		hysteria: hysteriaOptionsSchema.optional(),
		metadata: profileMetadataSchema.optional(),
	})
	.superRefine((profile, context) => {
		if (profile.protocol === 'shadowsocks') {
			if (!profile.authentication?.method) {
				context.addIssue({
					code: 'custom',
					path: ['authentication', 'method'],
					message: 'Shadowsocks method is required',
				})
			}
			if (!profile.authentication?.password) {
				context.addIssue({
					code: 'custom',
					path: ['authentication', 'password'],
					message: 'Shadowsocks password is required',
				})
			}
			if (profile.transport || profile.security) {
				context.addIssue({
					code: 'custom',
					message:
						'Shadowsocks profiles do not support V2Ray transport or security fields',
				})
			}
		} else if (profile.authentication?.method) {
			context.addIssue({
				code: 'custom',
				path: ['authentication', 'method'],
				message: 'Shadowsocks method is only valid for Shadowsocks profiles',
			})
		}

		if (profile.protocol === 'hysteria' || profile.protocol === 'hysteria2') {
			if (!profile.authentication?.password) {
				context.addIssue({
					code: 'custom',
					path: ['authentication', 'password'],
					message: 'Hysteria password is required',
				})
			}
			if (profile.security?.type !== 'tls') {
				context.addIssue({
					code: 'custom',
					path: ['security', 'type'],
					message: 'Hysteria requires TLS',
				})
			}
		}

		if (profile.protocol === 'hysteria') {
			for (const key of ['upMbps', 'downMbps'] as const) {
				if (!profile.hysteria?.[key]) {
					context.addIssue({
						code: 'custom',
						path: ['hysteria', key],
						message: `Hysteria ${key} is required`,
					})
				}
			}
		}

		if (profile.protocol === 'ssh') {
			if (!profile.authentication?.username) {
				context.addIssue({
					code: 'custom',
					path: ['authentication', 'username'],
					message: 'SSH username is required',
				})
			}
			if (!profile.authentication?.password) {
				context.addIssue({
					code: 'custom',
					path: ['authentication', 'password'],
					message: 'SSH password is required',
				})
			}
			if (!profile.authentication?.hostKey) {
				context.addIssue({
					code: 'custom',
					path: ['authentication', 'hostKey'],
					message: 'SSH host key is required',
				})
			}
		}

		if (
			profile.hysteria &&
			profile.protocol !== 'hysteria' &&
			profile.protocol !== 'hysteria2'
		) {
			context.addIssue({
				code: 'custom',
				path: ['hysteria'],
				message: 'Hysteria options are only valid for Hysteria profiles',
			})
		}
	})

const connectionsViewSchema = z
	.strictObject({
		version: z.literal(1),
		groupOpen: z.record(z.string(), z.boolean()),
		query: z.string().max(500),
		sort: z.enum(['default', 'endpoint', 'name', 'protocol', 'speed-test']),
		scrollOffset: z.number().finite().nonnegative().max(100_000_000).optional(),
		loadedProfileCount: z.number().int().min(1).max(100_000).optional(),
		recoveredFromInvalid: z.literal(true).optional(),
	})
	.optional()
	.catch({
		version: 1,
		groupOpen: {},
		query: '',
		sort: 'default',
		recoveredFromInvalid: true,
	})

const latencyResultSchema = z.strictObject({
	profileId: textSchema,
	reachable: z.boolean(),
	checkedAt: z.iso.datetime(),
	latencyMs: z.number().finite().nonnegative().optional(),
	error: z.string().max(500).optional(),
})

const latencyResultsSchema = z
	.record(textSchema, latencyResultSchema)
	.refine((results) => Object.keys(results).length <= 10_000, {
		message: 'At most 10000 latency results may be persisted',
	})
	.superRefine((results, context) => {
		for (const [profileId, result] of Object.entries(results)) {
			if (profileId !== result.profileId) {
				context.addIssue({
					code: 'custom',
					path: [profileId, 'profileId'],
					message: 'Latency result key must match profileId',
				})
			}
		}
	})

const smartConnectScheduleSchema = z.strictObject({
	enabled: z.boolean(),
	lastRunAt: z.iso.datetime().optional(),
	nextRunAt: z.iso.datetime().optional(),
	lastDecision: z
		.strictObject({
			profileId: textSchema,
			latencyMs: z.number().finite().nonnegative(),
			decidedAt: z.iso.datetime(),
		})
		.optional(),
})

export const settingsSchema = z.strictObject({
	activeProfileId: textSchema.optional(),
	localPort: z.number().int().min(1).max(65535).optional(),
	engineId: z.enum(['xray', 'sing-box']).default('sing-box'),
	connectionMode: z.enum(['vpn', 'proxy']).default('vpn'),
	routingMode: z.enum(['global', 'rule', 'direct']).optional(),
	language: textSchema.regex(/^[a-z]{2}(?:-[A-Z]{2})?$/u).optional(),
	theme: z.enum(['system', 'light', 'dark']).optional(),
	launchAtStartup: z.boolean().optional(),
	connectionsView: connectionsViewSchema,
	latencyResults: latencyResultsSchema.optional(),
	smartConnect: smartConnectScheduleSchema.optional(),
})

export function parseConnectionProfile(input: unknown) {
	assertPlainData(input, 'Connection profile')

	const result = connectionProfileSchema.safeParse(input)

	if (!result.success) {
		throwProfileValidationError(result.error, 'Invalid profile')
	}

	return result.data
}

export function parseSettings(input: unknown): Settings {
	if (!input || typeof input !== 'object' || Array.isArray(input)) {
		throw new ProfileError('invalid_profile', 'Settings must be an object')
	}

	assertPlainData(input, 'Settings')
	const result = settingsSchema.safeParse(input)

	if (!result.success) {
		throwProfileValidationError(result.error, 'Invalid settings')
	}

	return result.data
}

function throwProfileValidationError(
	error: z.ZodError,
	fallbackMessage: string,
): never {
	const firstIssue = error.issues[0]
	const path = firstIssue?.path.map(String).join('.')
	const message = firstIssue?.message ?? fallbackMessage

	throw new ProfileError(
		'invalid_profile',
		path ? `${path}: ${message}` : message,
		{ cause: error },
	)
}

function assertPlainData(input: unknown, label: string) {
	if (!isPlainData(input)) {
		throw new ProfileError(
			'invalid_profile',
			`${label} must contain only plain JSON-compatible objects`,
		)
	}
}

function isPlainData(input: unknown): boolean {
	if (input === null || typeof input !== 'object') {
		return true
	}

	if (Array.isArray(input)) {
		return input.every(isPlainData)
	}

	const prototype = Object.getPrototypeOf(input)

	if (prototype !== Object.prototype && prototype !== null) {
		return false
	}

	return Object.values(input).every(isPlainData)
}
