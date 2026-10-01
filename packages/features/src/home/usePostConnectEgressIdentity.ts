import type { ConnectionMode } from '@rahrow/core/connection/connection-mode.ts'
import type {
	EgressIdentity,
	EgressIdentityObservation,
} from '@rahrow/core/platform/egress-identity.ts'
import { useEffect, useRef, useState } from 'react'

export type CurrentAddressState =
	| {
			readonly status: 'available'
			readonly observation: EgressIdentityObservation
	  }
	| { readonly status: 'unavailable' }

export type PostConnectEgressIdentityState =
	| { readonly status: 'disconnected' }
	| { readonly status: 'loading' }
	| {
			readonly status: 'available'
			readonly observation: EgressIdentityObservation
			readonly current?: CurrentAddressState
	  }
	| { readonly status: 'unavailable'; readonly current?: CurrentAddressState }

const DISCONNECTED_STATE: PostConnectEgressIdentityState = {
	status: 'disconnected',
}

export function usePostConnectEgressIdentity(input: {
	readonly connectionState: string
	readonly connectionKey: string
	readonly mode: ConnectionMode
	readonly localPort: number
	readonly egressPath?: 'captured' | 'local-proxy'
	readonly identity?: EgressIdentity
}): PostConnectEgressIdentityState {
	const [state, setState] =
		useState<PostConnectEgressIdentityState>(DISCONNECTED_STATE)
	const generationRef = useRef(0)

	useEffect(() => {
		const generation = ++generationRef.current
		if (input.connectionState !== 'connected') {
			setState(DISCONNECTED_STATE)
			return
		}
		if (!input.identity) {
			setState({ status: 'unavailable' })
			return
		}

		const controller = new AbortController()
		const measureCurrentSeparately =
			input.mode === 'proxy' || input.egressPath === 'local-proxy'
		const proxyUrl = measureCurrentSeparately
			? loopbackSocksUrl(input.localPort)
			: undefined
		setState({ status: 'loading' })
		const exitObservation = input.identity.observe({
			mode: input.mode,
			...(proxyUrl ? { proxyUrl } : {}),
			signal: controller.signal,
		})
		const currentObservation = measureCurrentSeparately
			? input.identity.observe({
					mode: 'vpn',
					signal: controller.signal,
				})
			: undefined
		void Promise.allSettled([
			exitObservation,
			currentObservation ?? Promise.resolve(undefined),
		]).then(([exitResult, currentResult]) => {
			if (generation !== generationRef.current || controller.signal.aborted) return
			const current = currentAddress(measureCurrentSeparately, currentResult)
			if (exitResult.status === 'fulfilled') {
				setState({
					status: 'available',
					observation: exitResult.value,
					...(current ? { current } : {}),
				})
				return
			}
			setState(
				current ? { status: 'unavailable', current } : { status: 'unavailable' },
			)
		})

		return () => controller.abort(new Error('Connection route changed'))
	}, [
		input.connectionKey,
		input.connectionState,
		input.egressPath,
		input.identity,
		input.localPort,
		input.mode,
	])

	return state
}

function loopbackSocksUrl(port: number): string | undefined {
	if (!Number.isInteger(port) || port < 1 || port > 65_535) return undefined
	return `socks5://127.0.0.1:${port}`
}

function currentAddress(
	requested: boolean,
	result: PromiseSettledResult<EgressIdentityObservation | undefined>,
): CurrentAddressState | undefined {
	if (!requested) return undefined
	if (result.status === 'fulfilled' && result.value) {
		return { status: 'available', observation: result.value }
	}
	return { status: 'unavailable' }
}
