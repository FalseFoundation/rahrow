import {
	parseSecureSubscriptionUrl,
	readBoundedSubscriptionResponse,
	redactSubscriptionUrl,
	validateSubscriptionAuthorization,
} from './subscription-fetch-policy.ts'
import type {
	Subscription,
	SubscriptionFetcher,
} from './subscription-import.ts'
import { parseSubscriptionMetadata } from './subscription-import.ts'

export const SUBSCRIPTION_USER_AGENT = 'RahRow/0.0.0'

export interface SubscriptionHttpTransportRequest {
	readonly url: string
	readonly redirect: 'error'
	readonly headers: Readonly<Record<string, string>>
	readonly signal?: AbortSignal
}

export interface SubscriptionHttpTransport {
	request(input: SubscriptionHttpTransportRequest): Promise<Response>
}

export interface BufferedSubscriptionHttpResponse {
	readonly body: unknown
	readonly status?: number
	readonly subscriptionUserinfo?: unknown
	readonly profileUpdateInterval?: unknown
	readonly supportUrl?: unknown
	readonly profileWebPageUrl?: unknown
}

export interface HttpSubscriptionFetcherOptions {
	readonly transport?: SubscriptionHttpTransport
	readonly resolveCredential?: (
		credentialId: string,
	) => Promise<string | undefined>
	readonly userAgent?: string
}

export function createFetchSubscriptionTransport(
	fetchImplementation: typeof globalThis.fetch = globalThis.fetch,
): SubscriptionHttpTransport {
	return {
		async request(input) {
			return await fetchImplementation(input.url, {
				redirect: input.redirect,
				headers: input.headers,
				signal: input.signal,
			})
		},
	}
}

export function createBufferedSubscriptionResponse(
	input: BufferedSubscriptionHttpResponse,
): Response {
	if (typeof input.body !== 'string') {
		throw new Error('Native subscription response body is invalid')
	}

	const headers = new Headers()
	setHeader(headers, 'subscription-userinfo', input.subscriptionUserinfo)
	setHeader(headers, 'profile-update-interval', input.profileUpdateInterval)
	setHeader(headers, 'support-url', input.supportUrl)
	setHeader(headers, 'profile-web-page-url', input.profileWebPageUrl)

	return new Response(input.body, {
		status: input.status ?? 200,
		headers,
	})
}

export function createHttpSubscriptionFetcher(
	options: HttpSubscriptionFetcherOptions = {},
): SubscriptionFetcher {
	const transport = options.transport ?? createFetchSubscriptionTransport()
	const fetchResponse = async (
		subscription: Subscription,
		requestOptions?: { readonly signal?: AbortSignal },
	) => {
		const url = parseSecureSubscriptionUrl(subscription.url)
		const authorization = await resolveAuthorization(subscription, options)
		let response: Response
		try {
			response = await transport.request({
				url: url.toString(),
				redirect: 'error',
				signal: requestOptions?.signal,
				headers: {
					'User-Agent': options.userAgent ?? SUBSCRIPTION_USER_AGENT,
					...(authorization ? { Authorization: authorization } : {}),
				},
			})
		} catch {
			throw new Error(`Failed to fetch ${redactSubscriptionUrl(url.toString())}`)
		}

		if (!response.ok) {
			throw new Error(
				`HTTP ${response.status} fetching ${redactSubscriptionUrl(url.toString())}`,
			)
		}

		return {
			body: await readBoundedSubscriptionResponse(response),
			metadata: parseSubscriptionMetadata(response.headers),
		}
	}

	return {
		async fetch(subscription: Subscription, requestOptions) {
			return (await fetchResponse(subscription, requestOptions)).body
		},
		fetchWithMetadata: fetchResponse,
	}
}

export const httpSubscriptionFetcher = createHttpSubscriptionFetcher()

async function resolveAuthorization(
	subscription: Subscription,
	options: HttpSubscriptionFetcherOptions,
): Promise<string | undefined> {
	if (!subscription.credentialId) return undefined

	let authorization: string | undefined
	try {
		authorization = await options.resolveCredential?.(subscription.credentialId)
	} catch {
		throw new Error('Subscription credential is unavailable')
	}
	if (!authorization) {
		throw new Error('Subscription credential is unavailable')
	}

	return validateSubscriptionAuthorization(authorization)
}

function setHeader(headers: Headers, name: string, value: unknown): void {
	if (typeof value === 'string') headers.set(name, value)
}
