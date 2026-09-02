import {
	type EgressIdentityRequester,
	type EgressIdentityResponse,
	MAX_EGRESS_IDENTITY_BYTES,
} from '@rahrow/core/platform/egress-identity.ts'
import { invoke } from '@tauri-apps/api/core'

export interface DesktopRoutedHttpInput {
	readonly url: string
	readonly proxyUrl: string
	readonly timeoutMs: number
	readonly maxBytes: number
	readonly responseMode?: 'text' | 'byte-count'
}

export type DesktopRoutedHttpNativeRequest = (
	input: DesktopRoutedHttpInput,
) => Promise<EgressIdentityResponse>

const nativeRequest: DesktopRoutedHttpNativeRequest = (input) =>
	invoke<EgressIdentityResponse>('rahrow_routed_http_get', input)

export function createDesktopRoutedHttpRequester(
	request: DesktopRoutedHttpNativeRequest = nativeRequest,
): EgressIdentityRequester {
	return async (input) => {
		if (input.mode !== 'proxy' || !input.proxyUrl?.trim()) {
			throw new Error('Desktop proxy-routed HTTP requires a local SOCKS URL')
		}
		if (input.signal.aborted) throw abortReason(input.signal)

		return await raceWithAbort(
			request({
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
