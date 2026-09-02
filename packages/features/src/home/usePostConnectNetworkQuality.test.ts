import type {
	NetworkQualityProbe,
	NetworkQualityResult,
} from '@rahrow/core/network/cloudflare-network-quality.ts'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { usePostConnectNetworkQuality } from './usePostConnectNetworkQuality.ts'

describe('usePostConnectNetworkQuality', () => {
	it('runs once when a connection becomes connected', async () => {
		const test = vi.fn(async () => ({
			provider: 'cloudflare' as const,
			reachable: true,
			latencyMs: 28,
		}))
		const probe: NetworkQualityProbe = { test }
		const { result, rerender } = renderHook(
			({ connectionState }) =>
				usePostConnectNetworkQuality({
					connectionState,
					connectionKey: 'profile-1',
					mode: 'vpn',
					probe,
				}),
			{ initialProps: { connectionState: 'connecting' } },
		)

		expect(result.current.status).toBe('idle')
		rerender({ connectionState: 'connected' })
		await waitFor(() => expect(result.current.status).toBe('complete'))
		expect(result.current.result?.latencyMs).toBe(28)
		expect(test).toHaveBeenCalledWith(expect.objectContaining({ mode: 'vpn' }))

		rerender({ connectionState: 'connected' })
		expect(test).toHaveBeenCalledTimes(1)
	})

	it('routes a proxy-mode readiness check through the active loopback SOCKS port', async () => {
		const test = vi.fn(async () => ({
			provider: 'cloudflare' as const,
			reachable: true,
			latencyMs: 19,
		}))
		const probe: NetworkQualityProbe = { test }
		const { result } = renderHook(() =>
			usePostConnectNetworkQuality({
				connectionState: 'connected',
				connectionKey: 'profile-1:proxy:10808',
				mode: 'proxy',
				localPort: 10808,
				probe,
			}),
		)

		await waitFor(() => expect(result.current.status).toBe('complete'))
		expect(test).toHaveBeenCalledWith(
			expect.objectContaining({
				mode: 'proxy',
				proxyUrl: 'socks5://127.0.0.1:10808',
			}),
		)
	})

	it('cancels an in-flight check when the connection ends', async () => {
		let signal: AbortSignal | undefined
		const probe: NetworkQualityProbe = {
			test: vi.fn(async (options) => {
				signal = options?.signal
				return await new Promise<NetworkQualityResult>(() => undefined)
			}),
		}
		const { result, rerender } = renderHook(
			({ connectionState }) =>
				usePostConnectNetworkQuality({
					connectionState,
					connectionKey: 'profile-1',
					probe,
				}),
			{ initialProps: { connectionState: 'connected' } },
		)
		await waitFor(() => expect(result.current.status).toBe('testing'))

		act(() => rerender({ connectionState: 'disconnected' }))

		expect(signal?.aborted).toBe(true)
		expect(result.current).toEqual({ status: 'idle', result: null })
	})

	it('stays idle when no platform probe is available', () => {
		const { result } = renderHook(() =>
			usePostConnectNetworkQuality({
				connectionState: 'connected',
				connectionKey: 'profile-1',
			}),
		)

		expect(result.current).toEqual({ status: 'idle', result: null })
	})

	it('contains an unexpected provider rejection', async () => {
		const probe: NetworkQualityProbe = {
			test: async () => {
				throw new Error('provider detail')
			},
		}
		const { result } = renderHook(() =>
			usePostConnectNetworkQuality({
				connectionState: 'connected',
				connectionKey: 'profile-1',
				probe,
			}),
		)

		await waitFor(() => expect(result.current.status).toBe('complete'))
		expect(result.current.result).toEqual({
			provider: 'cloudflare',
			reachable: false,
			error: 'network-test-unavailable',
		})
	})
})
