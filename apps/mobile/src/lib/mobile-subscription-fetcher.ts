import { Capacitor, registerPlugin } from '@capacitor/core'
import {
	type BufferedSubscriptionHttpResponse,
	createBufferedSubscriptionResponse,
	createFetchSubscriptionTransport,
	createHttpSubscriptionFetcher,
} from '@rahrow/core/subscription/http-subscription-fetcher.ts'
import type { SubscriptionFetcher } from '@rahrow/core/subscription/subscription-import.ts'

export interface MobileSubscriptionFetchInput {
	readonly url: string
	readonly authorization?: string
}

export interface MobileSubscriptionHttpResponse
	extends BufferedSubscriptionHttpResponse {
	readonly body: string
}

export interface RahRowSubscriptionPlugin {
	fetch(
		input: MobileSubscriptionFetchInput,
	): Promise<MobileSubscriptionHttpResponse>
}

export interface MobileSubscriptionFetcherOptions {
	readonly platform?: string
	readonly plugin?: RahRowSubscriptionPlugin
	readonly resolveCredential?: (credentialId: string) => Promise<string>
	readonly fetch?: typeof globalThis.fetch
}

export const nativeRahRowSubscription =
	registerPlugin<RahRowSubscriptionPlugin>('RahRowSubscription')

export function createMobileSubscriptionFetcher(
	options: MobileSubscriptionFetcherOptions = {},
): SubscriptionFetcher {
	const platform = options.platform ?? Capacitor.getPlatform()
	if (platform !== 'android' && platform !== 'ios') {
		return createHttpSubscriptionFetcher({
			transport: createFetchSubscriptionTransport(options.fetch),
			resolveCredential: options.resolveCredential,
		})
	}

	const plugin = options.plugin ?? nativeRahRowSubscription
	return createHttpSubscriptionFetcher({
		transport: {
			async request(input) {
				return createBufferedSubscriptionResponse(
					await plugin.fetch({
						url: input.url,
						...(input.headers.Authorization
							? { authorization: input.headers.Authorization }
							: {}),
					}),
				)
			},
		},
		resolveCredential: options.resolveCredential,
	})
}
