import { z } from 'zod'
import { translate } from '../app/app-i18n.tsx'

const MAX_TEXT_LENGTH = 512

export function requiredTextSchema(label: string) {
	return z
		.string()
		.max(
			MAX_TEXT_LENGTH,
			`${label} must be ${MAX_TEXT_LENGTH} characters or fewer`,
		)
		.refine((value) => Boolean(value.trim()), `${label} is required`)
}

export function optionalTextSchema(label: string) {
	return z
		.string()
		.max(
			MAX_TEXT_LENGTH,
			`${label} must be ${MAX_TEXT_LENGTH} characters or fewer`,
		)
}

export const portTextSchema = z.string().refine((value) => {
	const port = Number(value)
	return Number.isInteger(port) && port > 0 && port <= 65_535
}, 'Enter a port from 1 to 65535')

export function positiveNumberTextSchema(label: string, optional = false) {
	return z.string().refine((value) => {
		if (optional && !value.trim()) return true
		const number = Number(value)
		return Number.isFinite(number) && number > 0
	}, `${label} must be greater than zero`)
}

export function firstFormError(errors: readonly unknown[]): string | undefined {
	for (const error of errors) {
		if (typeof error === 'string') return translateValidationMessage(error)
		if (
			typeof error === 'object' &&
			error !== null &&
			'message' in error &&
			typeof error.message === 'string'
		) {
			return translateValidationMessage(error.message)
		}
	}
	return undefined
}

function translateValidationMessage(message: string): string {
	if (message === 'Enter a port from 1 to 65535')
		return translate('validation.port')
	const required = message.match(/^(.+) is required$/)
	if (required)
		return translate('validation.required', {
			label: validationLabel(required[1] ?? ''),
		})
	const max = message.match(/^(.+) must be (\d+) characters or fewer$/)
	if (max)
		return translate('validation.max', {
			label: validationLabel(max[1] ?? ''),
			max: Number(max[2]),
		})
	const positive = message.match(/^(.+) must be greater than zero$/)
	if (positive)
		return translate('validation.positive', {
			label: validationLabel(positive[1] ?? ''),
		})
	return message
}

function validationLabel(label: string): string {
	const key = label.toLowerCase().replaceAll(' ', '')
	const known = [
		'name',
		'server',
		'tlsservername',
		'password',
		'userid',
		'displayname',
		'passwordorkey',
		'username',
		'pinnedhostkey',
		'uploadmbps',
		'downloadmbps',
		'obfuscationpassword',
		'remarks',
		'flow',
		'encryption',
		'transporthost',
		'transportpath',
		'servicename',
		'fingerprint',
		'realitypublickey',
		'realityshortid',
		'realityspiderpath',
		'alpn',
	]
	return known.includes(key) ? translate(`validation.fields.${key}`) : label
}
