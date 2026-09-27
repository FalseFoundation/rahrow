import {
	createEgressIdentity,
	type EgressIdentity,
	type EgressIdentityRequester,
	readBoundedEgressResponse,
} from '@rahrow/core/platform/egress-identity.ts'

type HostFetch = (input: string, init: RequestInit) => Promise<Response>

export function createMobileEgressIdentity(
	fetcher: HostFetch = globalThis.fetch,
	routedRequest?: EgressIdentityRequester,
): EgressIdentity {
	const request: EgressIdentityRequester = async (input) => {
		// Android VPN excludes this app from the tunnel, so a WebView fetch
		// reports the device address. A proxy URL means the caller wants the
		// address observed through the local SOCKS listener.
		if (input.proxyUrl?.trim()) {
			if (!routedRequest) {
				throw new Error('Mobile proxy-routed egress observation is unavailable')
			}
			return await routedRequest({
				...input,
				mode: 'proxy',
				proxyUrl: input.proxyUrl,
			})
		}

		const response = await fetcher(input.url, {
			method: 'GET',
			headers: { Accept: 'text/plain, application/json' },
			credentials: 'omit',
			cache: 'no-store',
			redirect: 'error',
			signal: input.signal,
		})
		return {
			status: response.status,
			body: await readBoundedEgressResponse(response),
		}
	}

	return createEgressIdentity({ request })
}
