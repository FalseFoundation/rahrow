import type { ConnectionMode } from '@rahrow/core/connection/connection-mode.ts'
import type {
	NetworkQualityProbe,
	NetworkQualityResult,
} from '@rahrow/core/network/cloudflare-network-quality.ts'
import { useCallback, useEffect, useRef, useState } from 'react'

export type PostConnectNetworkQualityState =
	| { readonly status: 'idle'; readonly result: null }
	| { readonly status: 'testing'; readonly result: null }
	| { readonly status: 'complete'; readonly result: NetworkQualityResult }

const IDLE_STATE: PostConnectNetworkQualityState = {
	status: 'idle',
	result: null,
}

export function usePostConnectNetworkQuality(input: {
	readonly connectionState: string
	readonly connectionKey: string
	readonly mode?: ConnectionMode
	readonly localPort?: number
	readonly egressPath?: 'captured' | 'local-proxy'
	readonly probe?: NetworkQualityProbe
}): {
	readonly state: PostConnectNetworkQualityState
	readonly retest: () => void
} {
	const [state, setState] = useState<PostConnectNetworkQualityState>(IDLE_STATE)
	const [retestToken, setRetestToken] = useState(0)
	const completedKeyRef = useRef<string | null>(null)

	const retest = useCallback(() => {
		completedKeyRef.current = null
		setRetestToken((token) => token + 1)
	}, [])

	useEffect(() => {
		if (input.connectionState !== 'connected' || !input.probe) {
			completedKeyRef.current = null
			setState(IDLE_STATE)
			return
		}

		const runKey = `${input.connectionKey}:${retestToken}`
		if (completedKeyRef.current === runKey) return

		const controller = new AbortController()
		let active = true
		const proxyUrl =
			(input.mode === 'proxy' || input.egressPath === 'local-proxy') &&
			Number.isInteger(input.localPort) &&
			(input.localPort ?? 0) > 0 &&
			(input.localPort ?? 0) <= 65_535
				? `socks5://127.0.0.1:${input.localPort}`
				: undefined
		setState({ status: 'testing', result: null })
		void Promise.resolve(
			input.probe.test({
				signal: controller.signal,
				mode: input.mode,
				proxyUrl,
			}),
		)
			.catch(
				(): NetworkQualityResult => ({
					provider: 'cloudflare',
					reachable: false,
					error: 'network-test-unavailable',
				}),
			)
			.then((result) => {
				if (!active || controller.signal.aborted) return
				completedKeyRef.current = runKey
				setState({ status: 'complete', result })
			})

		return () => {
			active = false
			controller.abort()
		}
	}, [
		input.connectionKey,
		input.connectionState,
		input.egressPath,
		input.localPort,
		input.mode,
		input.probe,
		retestToken,
	])

	return { state, retest }
}
