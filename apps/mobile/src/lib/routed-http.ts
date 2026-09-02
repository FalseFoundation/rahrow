import { Capacitor, registerPlugin } from '@capacitor/core'
import {
	type EgressIdentityRequester,
	type EgressIdentityResponse,
	MAX_EGRESS_IDENTITY_BYTES,
} from '@rahrow/core/platform/egress-identity.ts'

export interface MobileRoutedHttpInput {
	readonly url: string
	readonly proxyUrl: string
	readonly timeoutMs: number
	readonly maxBytes: number
	readonly responseMode?: 'text' | 'byte-count'
}

export interface RahRowNetworkPlugin {
	request(input: MobileRoutedHttpInput): Promise<EgressIdentityResponse>
}

export interface MobileRoutedHttpRequesterOptions {
	readonly platform?: string
	readonly plugin?: RahRowNetworkPlugin
}

export const nativeRahRowNetwork =
	registerPlugin<RahRowNetworkPlugin>('RahRowNetwork')

export function createMobileRoutedHttpRequester(
	options: MobileRoutedHttpRequesterOptions = {},
): EgressIdentityRequester {
	const platform = options.platform ?? Capacitor.getPlatform()
	const plugin = options.plugin ?? nativeRahRowNetwork

	return async (input) => {
		if (
			(platform !== 'android' && platform !== 'ios') ||
			input.mode !== 'proxy' ||
			!input.proxyUrl?.trim()
		) {
			throw new Error('Mobile proxy-routed HTTP is unavailable')
		}
		if (input.signal.aborted) throw abortReason(input.signal)

		return await raceWithAbort(
			plugin.request({
				url: input.url,
				proxyUrl: input.proxyUrl,
				timeoutMs: 8_000,
				maxBytes: input.maxBytes ?? MAX_EGRESS_IDENTITY_BYTES,
				...(input.responseMode ? { responseMode: input.responseMode } : {}),
			}),
			input.signal,
		)
	}
}

async function raceWithAbort<T>(
	request: Promise<T>,
	signal: AbortSignal,
): Promise<T> {
	return await new Promise<T>((resolve, reject) => {
		const onAbort = () => reject(abortReason(signal))
		signal.addEventListener('abort', onAbort, { once: true })
		request.then(
			(value) => {
				signal.removeEventListener('abort', onAbort)
				resolve(value)
			},
			(error: unknown) => {
				signal.removeEventListener('abort', onAbort)
				reject(error)
			},
		)
	})
}

function abortReason(signal: AbortSignal): unknown {
	return signal.reason ?? new Error('Routed HTTP request canceled')
}
