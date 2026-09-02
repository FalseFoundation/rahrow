import { parseSecureSubscriptionUrl } from '@rahrow/core/subscription/subscription-fetch-policy.ts'
import { z } from 'zod'

import { optionalTextSchema } from '../forms/form-validation.ts'

export interface SubscriptionDraftFormValues {
	readonly url: string
	readonly name: string
}

export const subscriptionDraftFormSchema: z.ZodType<
	SubscriptionDraftFormValues,
	SubscriptionDraftFormValues
> = z.strictObject({
	url: z.string().superRefine((value, context) => {
		try {
			parseSecureSubscriptionUrl(value)
		} catch (error) {
			context.addIssue({
				code: 'custom',
				message:
					error instanceof Error
						? error.message
						: 'Enter a valid HTTPS subscription URL',
			})
		}
	}),
	name: optionalTextSchema('Display name'),
})

export function deriveSubscriptionId(input: {
	readonly name: string
	readonly url: string
	readonly existingIds: readonly string[]
}): string {
	const nameSlug = slug(input.name)
	const urlSlug = urlIdentifier(input.url)
	const base = nameSlug || urlSlug || 'subscription'
	const existing = new Set(input.existingIds)

	if (!existing.has(base)) return base
	let suffix = 2
	while (existing.has(`${base}-${suffix}`)) suffix += 1
	return `${base}-${suffix}`
}

export function normalizeSubscriptionUrl(value: string): string {
	const url = new URL(value.trim())
	url.hash = ''
	return url.toString()
}

function urlIdentifier(value: string): string {
	try {
		const url = new URL(value.trim())
		const hostname = url.hostname.replace(/^www\./, '').replace(/\./g, '-')
		const lastSegment = url.pathname
			.split('/')
			.filter(Boolean)
			.at(-1)
			?.replace(/\.[a-z0-9]+$/i, '')
		return slug([hostname, lastSegment].filter(Boolean).join('-'))
	} catch {
		return ''
	}
}

function slug(value: string): string {
	return value
		.trim()
		.toLowerCase()
		.normalize('NFKD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
}
