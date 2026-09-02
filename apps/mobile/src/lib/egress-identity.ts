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
		if (input.mode === 'proxy') {
			if (!routedRequest) {
				throw new Error('Mobile proxy-routed egress observation is unavailable')
			}
			return await routedRequest(input)
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
