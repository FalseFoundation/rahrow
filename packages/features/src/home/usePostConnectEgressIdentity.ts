import type { ConnectionMode } from '@rahrow/core/connection/connection-mode.ts'
import type {
	EgressIdentity,
	EgressIdentityObservation,
} from '@rahrow/core/platform/egress-identity.ts'
import { useEffect, useRef, useState } from 'react'

export type PostConnectEgressIdentityState =
	| { readonly status: 'disconnected' }
	| { readonly status: 'loading' }
	| {
			readonly status: 'available'
			readonly observation: EgressIdentityObservation
	  }
	| { readonly status: 'unavailable' }

const DISCONNECTED_STATE: PostConnectEgressIdentityState = {
	status: 'disconnected',
}

export function usePostConnectEgressIdentity(input: {
	readonly connectionState: string
	readonly connectionKey: string
	readonly mode: ConnectionMode
	readonly localPort: number
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
		setState({ status: 'loading' })
		void input.identity
			.observe({
				mode: input.mode,
				...(input.mode === 'proxy'
					? { proxyUrl: `socks5://127.0.0.1:${input.localPort}` }
					: {}),
				signal: controller.signal,
			})
			.then((observation) => {
				if (generation !== generationRef.current || controller.signal.aborted)
					return
				setState({ status: 'available', observation })
			})
			.catch(() => {
				if (generation !== generationRef.current || controller.signal.aborted)
					return
				setState({ status: 'unavailable' })
			})

		return () => controller.abort(new Error('Connection route changed'))
	}, [
		input.connectionKey,
		input.connectionState,
		input.identity,
		input.localPort,
		input.mode,
	])

	return state
}
