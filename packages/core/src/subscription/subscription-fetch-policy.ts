import { ProfileError } from '../errors.ts'

export const MAX_SUBSCRIPTION_BYTES = 8 * 1024 * 1024
export const MAX_SUBSCRIPTION_CREDENTIAL_BYTES = 8_192

export function parseSecureSubscriptionUrl(value: string): URL {
	let url: URL

	try {
		url = new URL(value.trim())
	} catch {
		throw new ProfileError('invalid_profile', 'Invalid subscription URL')
	}

	if (url.protocol !== 'https:') {
		throw new ProfileError('invalid_profile', 'Subscription URLs must use HTTPS')
	}
	if (url.username || url.password) {
		throw new ProfileError(
			'invalid_profile',
			'Subscription URL credentials are not allowed',
		)
	}
	if (url.hash) {
		throw new ProfileError(
			'invalid_profile',
			'Subscription URLs must not contain fragments',
		)
	}
	if (isLocalHost(url.hostname)) {
		throw new ProfileError(
			'invalid_profile',
			'Subscription URLs must target a public host',
		)
	}

	return url
}

export function redactSubscriptionUrl(value: string): string {
	try {
		const url = new URL(value)
		url.username = ''
		url.password = ''
		url.hash = ''
		if (url.pathname !== '/') {
			url.pathname = '/[redacted]'
		}
		for (const key of new Set(url.searchParams.keys())) {
			url.searchParams.set(key, '[redacted]')
		}

		return url.toString()
	} catch {
		return '[invalid subscription URL]'
	}
}

export function validateSubscriptionAuthorization(value: string): string {
	if (
		value.length === 0 ||
		new TextEncoder().encode(value).byteLength >
			MAX_SUBSCRIPTION_CREDENTIAL_BYTES ||
		/[\r\n]/u.test(value)
	) {
		throw new Error('Subscription credential is invalid')
	}

	return value
}

export async function readBoundedSubscriptionResponse(
	response: Response,
): Promise<string> {
	const contentLength = response.headers.get('content-length')
	if (contentLength) {
		assertSubscriptionResponseSize(Number(contentLength))
	}
	if (!response.body) {
		return ''
	}

	const reader = response.body.getReader()
	const chunks: Uint8Array[] = []
	let size = 0

	try {
		while (true) {
			const result = await reader.read()
			if (result.done) break
			size += result.value.byteLength
			if (size > MAX_SUBSCRIPTION_BYTES) {
				await reader.cancel()
				assertSubscriptionResponseSize(size)
			}
			chunks.push(result.value)
		}
	} finally {
		reader.releaseLock()
	}

	const bytes = new Uint8Array(size)
	let offset = 0
	for (const chunk of chunks) {
		bytes.set(chunk, offset)
		offset += chunk.byteLength
	}

	try {
		return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
	} catch (error) {
		throw new ProfileError(
			'invalid_profile',
			'Subscription response is not valid UTF-8',
			{ cause: error },
		)
	}
}

export function assertSubscriptionResponseSize(bytes: number): void {
	if (!Number.isSafeInteger(bytes) || bytes < 0) {
		throw new ProfileError(
			'invalid_profile',
			'Invalid subscription response size',
		)
	}
	if (bytes > MAX_SUBSCRIPTION_BYTES) {
		throw new ProfileError(
			'invalid_profile',
			'Subscription response is too large',
		)
	}
}

function isLocalHost(input: string): boolean {
	const hostname = input.replace(/^\[|\]$/gu, '').toLowerCase()

	if (
		hostname === 'localhost' ||
		hostname.endsWith('.localhost') ||
		hostname.endsWith('.local') ||
		hostname === '::1' ||
		hostname.startsWith('fc') ||
		hostname.startsWith('fd') ||
		hostname.startsWith('fe8') ||
		hostname.startsWith('fe9') ||
		hostname.startsWith('fea') ||
		hostname.startsWith('feb')
	) {
		return true
	}

	const octets = hostname.split('.').map(Number)
	if (
		octets.length !== 4 ||
		octets.some((octet) => !Number.isInteger(octet) || octet < 0 || octet > 255)
	) {
		return false
	}

	const [first = -1, second = -1] = octets
	return (
		first === 0 ||
		first === 10 ||
		first === 127 ||
		(first === 100 && second >= 64 && second <= 127) ||
		(first === 169 && second === 254) ||
		(first === 172 && second >= 16 && second <= 31) ||
		(first === 192 && second === 168)
	)
}
