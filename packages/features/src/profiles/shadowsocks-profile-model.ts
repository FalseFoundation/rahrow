import type {
	ConnectionProfile,
	ShadowsocksMethod,
} from '@rahrow/core/profile/connection-profile.ts'
import { SHADOWSOCKS_METHODS } from '@rahrow/core/profile/connection-profile.ts'
import { parseConnectionProfile } from '@rahrow/core/profile/profile-schema.ts'
import { serializeConnectionProfile } from '@rahrow/core/protocol/connection-protocol.ts'
import { z } from 'zod'
import { translate } from '../app/app-i18n.tsx'

import {
	optionalTextSchema,
	portTextSchema,
	requiredTextSchema,
} from '../forms/form-validation.ts'

export interface ShadowsocksProfileDraft {
	readonly name?: string
	readonly host: string
	readonly port: number
	readonly method: ShadowsocksMethod
	readonly password: string
}

export interface ShadowsocksProfileFormValues {
	name: string
	host: string
	port: string
	method: ShadowsocksMethod
	password: string
}

export const shadowsocksProfileFormSchema: z.ZodType<
	ShadowsocksProfileFormValues,
	ShadowsocksProfileFormValues
> = z.strictObject({
	name: optionalTextSchema('Name'),
	host: requiredTextSchema('Server'),
	port: portTextSchema,
	method: z.enum(SHADOWSOCKS_METHODS),
	password: requiredTextSchema('Password or key'),
})

export function shadowsocksProfileDefaultValues(
	profile?: ConnectionProfile,
): ShadowsocksProfileFormValues {
	const shadowsocks = profile?.protocol === 'shadowsocks' ? profile : undefined

	return {
		name: shadowsocks?.metadata?.name ?? '',
		host: shadowsocks?.endpoint.host ?? '',
		port: String(shadowsocks?.endpoint.port ?? 8388),
		method: shadowsocks?.authentication?.method ?? 'aes-256-gcm',
		password: shadowsocks?.authentication?.password ?? '',
	}
}

export function createShadowsocksProfileFromForm(
	values: ShadowsocksProfileFormValues,
	existing?: ConnectionProfile,
) {
	return createShadowsocksProfile(
		{
			name: values.name,
			host: values.host,
			port: Number(values.port),
			method: values.method,
			password: values.password,
		},
		existing,
	)
}

export function validateShadowsocksMethod(
	value: ShadowsocksMethod,
): string | undefined {
	return SHADOWSOCKS_METHODS.includes(value)
		? undefined
		: 'Select a supported method'
}

export function shadowsocksSaveErrorMessage(
	_reason: unknown,
	_password: string,
): string {
	return translate('editor.errors.save')
}

export function createShadowsocksProfile(
	draft: ShadowsocksProfileDraft,
	existing?: ConnectionProfile,
) {
	if (existing && existing.protocol !== 'shadowsocks') {
		throw new Error('Only Shadowsocks profiles can be edited here')
	}

	const { name: _existingName, ...existingMetadata } = existing?.metadata ?? {}

	return parseConnectionProfile({
		id: existing?.id ?? `manual:shadowsocks@${draft.host}:${draft.port}`,
		protocol: 'shadowsocks',
		endpoint: { host: draft.host, port: draft.port },
		authentication: { method: draft.method, password: draft.password },
		metadata: {
			...existingMetadata,
			...(draft.name?.trim() ? { name: draft.name.trim() } : {}),
			source: existing?.metadata?.source ?? 'manual',
		},
	})
}

export function createShadowsocksShareUrl(draft: ShadowsocksProfileDraft) {
	return serializeConnectionProfile(createShadowsocksProfile(draft))
}
