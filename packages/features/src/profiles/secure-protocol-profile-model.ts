import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { parseConnectionProfile } from '@rahrow/core/profile/profile-schema.ts'
import { z } from 'zod'

import {
	optionalTextSchema,
	portTextSchema,
	positiveNumberTextSchema,
	requiredTextSchema,
} from '../forms/form-validation.ts'

export type SecureProtocol = 'hysteria' | 'hysteria2' | 'ssh'

interface SecureProtocolDraftBase {
	readonly protocol: SecureProtocol
	readonly name?: string
	readonly host: string
	readonly port: number
	readonly password: string
}

interface SshProtocolProfileDraft extends SecureProtocolDraftBase {
	readonly protocol: 'ssh'
	readonly username: string
	readonly hostKey: string
}

interface HysteriaProtocolProfileDraft extends SecureProtocolDraftBase {
	readonly protocol: 'hysteria' | 'hysteria2'
	readonly serverName?: string
	readonly upMbps?: number
	readonly downMbps?: number
	readonly obfsPassword?: string
}

export type SecureProtocolProfileDraft =
	| HysteriaProtocolProfileDraft
	| SshProtocolProfileDraft

export interface SecureProtocolFormValues {
	readonly protocol: SecureProtocol
	readonly name: string
	readonly host: string
	readonly port: string
	readonly username: string
	readonly password: string
	readonly hostKey: string
	readonly serverName: string
	readonly upMbps: string
	readonly downMbps: string
	readonly obfsPassword: string
}

export const secureProtocolFormSchema: z.ZodType<
	SecureProtocolFormValues,
	SecureProtocolFormValues
> = z
	.strictObject({
		protocol: z.enum(['hysteria', 'hysteria2', 'ssh']),
		name: optionalTextSchema('Name'),
		host: requiredTextSchema('Server'),
		port: portTextSchema,
		username: z.string(),
		password: requiredTextSchema('Password'),
		hostKey: z.string(),
		serverName: optionalTextSchema('TLS server name'),
		upMbps: z.string(),
		downMbps: z.string(),
		obfsPassword: optionalTextSchema('Obfuscation password'),
	})
	.superRefine((values, context) => {
		if (values.protocol === 'ssh') {
			for (const [path, label] of [
				['username', 'Username'],
				['hostKey', 'Pinned host key'],
			] as const) {
				if (!values[path].trim()) {
					context.addIssue({
						code: 'custom',
						path: [path],
						message: `${label} is required`,
					})
				}
			}
			return
		}

		if (values.protocol === 'hysteria') {
			for (const [path, label] of [
				['upMbps', 'Upload Mbps'],
				['downMbps', 'Download Mbps'],
			] as const) {
				const result = positiveNumberTextSchema(label).safeParse(values[path])
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

export function secureProtocolDefaultValues(
	profile?: ConnectionProfile,
	initialProtocol?: SecureProtocol,
): SecureProtocolFormValues {
	return {
		protocol:
			(profile?.protocol as SecureProtocol | undefined) ??
			initialProtocol ??
			'hysteria2',
		name: profile?.metadata?.name ?? '',
		host: profile?.endpoint.host ?? '',
		port: String(profile?.endpoint.port ?? 443),
		username: profile?.authentication?.username ?? '',
		password: profile?.authentication?.password ?? '',
		hostKey: profile?.authentication?.hostKey ?? '',
		serverName: profile?.security?.serverName ?? '',
		upMbps: String(profile?.hysteria?.upMbps ?? 50),
		downMbps: String(profile?.hysteria?.downMbps ?? 100),
		obfsPassword: profile?.hysteria?.obfsPassword ?? '',
	}
}

export function createSecureProtocolProfileFromForm(
	values: SecureProtocolFormValues,
	existing?: ConnectionProfile,
): ConnectionProfile {
	const common = {
		name: values.name,
		host: values.host,
		port: Number(values.port),
		password: values.password,
	}

	return createSecureProtocolProfile(
		values.protocol === 'ssh'
			? {
					...common,
					protocol: 'ssh',
					username: values.username,
					hostKey: values.hostKey,
				}
			: {
					...common,
					protocol: values.protocol,
					serverName: values.serverName,
					upMbps: Number(values.upMbps),
					downMbps: Number(values.downMbps),
					obfsPassword: values.obfsPassword,
				},
		existing,
	)
}

export function validateSecureHost(value: string): string | undefined {
	return value.trim() ? undefined : 'Server is required'
}

export function validateSecurePort(value: string): string | undefined {
	const port = Number(value)
	return Number.isInteger(port) && port > 0 && port <= 65_535
		? undefined
		: 'Enter a port from 1 to 65535'
}

export function validateSecureRequired(
	value: string,
	label: string,
): string | undefined {
	return value.trim() ? undefined : `${label} is required`
}

export function validateSecureRate(
	value: string,
	label: string,
): string | undefined {
	const number = Number(value)
	return Number.isFinite(number) && number > 0
		? undefined
		: `${label} must be greater than zero`
}

export function createSecureProtocolProfile(
	draft: SecureProtocolProfileDraft,
	existing?: ConnectionProfile,
): ConnectionProfile {
	const isSsh = draft.protocol === 'ssh'
	const obfsPassword = isSsh
		? undefined
		: draft.obfsPassword === undefined
			? existing?.hysteria?.obfsPassword
			: draft.obfsPassword.trim() || undefined

	return parseConnectionProfile({
		id:
			existing?.id ??
			`manual:${draft.protocol}@${draft.host.trim()}:${draft.port}`,
		protocol: draft.protocol,
		endpoint: { host: draft.host.trim(), port: draft.port },
		authentication: isSsh
			? {
					username: draft.username.trim(),
					password: draft.password,
					hostKey: draft.hostKey.trim(),
				}
			: { password: draft.password },
		...(isSsh
			? {}
			: {
					security: {
						type: 'tls' as const,
						serverName: draft.serverName?.trim() || draft.host.trim(),
					},
					hysteria: {
						upMbps: draft.upMbps,
						downMbps: draft.downMbps,
						...(obfsPassword ? { obfsPassword } : {}),
					},
				}),
		metadata: {
			...(existing?.metadata?.tags ? { tags: existing.metadata.tags } : {}),
			...(draft.name?.trim() ? { name: draft.name.trim() } : {}),
			source: existing?.metadata?.source ?? 'manual',
		},
	})
}
