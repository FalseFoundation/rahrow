import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { parseConnectionProfile } from '@rahrow/core/profile/profile-schema.ts'
import { z } from 'zod'

import {
	optionalTextSchema,
	portTextSchema,
	requiredTextSchema,
} from '../forms/form-validation.ts'

export type StandardProtocol = 'vless' | 'vmess' | 'trojan'

export interface StandardProfileFormValues {
	protocol: StandardProtocol
	name: string
	host: string
	port: string
	credential: string
	security: 'none' | 'tls'
	serverName: string
}

export const standardProfileFormSchema: z.ZodType<
	StandardProfileFormValues,
	StandardProfileFormValues
> = z
	.strictObject({
		protocol: z.enum(['vless', 'vmess', 'trojan']),
		name: optionalTextSchema('Name'),
		host: requiredTextSchema('Server'),
		port: portTextSchema,
		credential: z.string(),
		security: z.enum(['none', 'tls']),
		serverName: optionalTextSchema('TLS server name'),
	})
	.superRefine((values, context) => {
		if (!values.credential.trim()) {
			context.addIssue({
				code: 'custom',
				path: ['credential'],
				message:
					values.protocol === 'trojan'
						? 'Password is required'
						: 'User ID is required',
			})
		}
	})

export interface StandardProfileDraft {
	readonly protocol: StandardProtocol
	readonly name?: string
	readonly host: string
	readonly port: number
	readonly credential: string
	readonly security: 'none' | 'tls'
	readonly serverName?: string
}

export function standardProfileDefaultValues(
	protocol: StandardProtocol,
): StandardProfileFormValues {
	return {
		protocol,
		name: '',
		host: '',
		port: '443',
		credential: '',
		security: 'tls',
		serverName: '',
	}
}

export function standardCredentialLabel(protocol: StandardProtocol): string {
	return protocol === 'trojan' ? 'Password' : 'User ID'
}

export function validateStandardHost(value: string): string | undefined {
	return value.trim() ? undefined : 'Server is required'
}

export function validateStandardPort(value: string): string | undefined {
	const port = Number(value)
	return Number.isInteger(port) && port > 0 && port <= 65_535
		? undefined
		: 'Enter a port from 1 to 65535'
}

export function validateStandardCredential(
	protocol: StandardProtocol,
	value: string,
): string | undefined {
	return value.trim()
		? undefined
		: `${standardCredentialLabel(protocol)} is required`
}

export function createStandardProfileFromForm(
	values: StandardProfileFormValues,
): ConnectionProfile {
	return createStandardProfile({
		protocol: values.protocol,
		name: values.name,
		host: values.host,
		port: Number(values.port),
		credential: values.credential,
		security: values.security,
		serverName: values.security === 'tls' ? values.serverName : undefined,
	})
}

export function createStandardProfile(
	draft: StandardProfileDraft,
): ConnectionProfile {
	const host = draft.host.trim()
	const credential = draft.credential.trim()

	if (!credential) {
		throw new Error(
			draft.protocol === 'trojan' ? 'Password is required' : 'User ID is required',
		)
	}

	return parseConnectionProfile({
		id: `manual:${draft.protocol}@${host}:${draft.port}`,
		protocol: draft.protocol,
		endpoint: { host, port: draft.port },
		transport: { type: 'tcp' },
		security: {
			type: draft.security,
			...(draft.security === 'tls'
				? { serverName: draft.serverName?.trim() || host }
				: {}),
		},
		authentication:
			draft.protocol === 'trojan' ? { password: credential } : { id: credential },
		metadata: {
			...(draft.name?.trim() ? { name: draft.name.trim() } : {}),
			source: 'manual',
		},
	})
}
