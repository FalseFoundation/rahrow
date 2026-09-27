import type {
	EgressIdentity,
	EgressIdentityObservation,
} from '@rahrow/core/platform/egress-identity.ts'
import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { usePostConnectEgressIdentity } from './usePostConnectEgressIdentity.ts'

describe('usePostConnectEgressIdentity', () => {
	it('observes only after connection success and includes proxy routing details', async () => {
		const observe = vi.fn(
			async (): Promise<EgressIdentityObservation> => ({
				ip: '203.0.113.41',
				countryCode: 'NL',
				provider: 'cloudflare',
			}),
		)
		const identity: EgressIdentity = { observe }
		const { result, rerender } = renderHook(
			({ connectionState }) =>
				usePostConnectEgressIdentity({
					connectionState,
					connectionKey: 'profile-a:proxy:sing-box',
					mode: 'proxy',
					localPort: 12080,
					identity,
				}),
			{ initialProps: { connectionState: 'connecting' } },
		)

		expect(result.current).toEqual({ status: 'disconnected' })
		expect(observe).not.toHaveBeenCalled()

		rerender({ connectionState: 'connected' })
		await waitFor(() => expect(result.current.status).toBe('available'))
		expect(observe).toHaveBeenCalledWith({
			mode: 'proxy',
			proxyUrl: 'socks5://127.0.0.1:12080',
			signal: expect.any(AbortSignal),
		})
		expect(observe).toHaveBeenCalledWith({
			mode: 'vpn',
			signal: expect.any(AbortSignal),
		})
	})

	it('measures the device address directly and the exit address through SOCKS on Android VPN', async () => {
		const observe = vi.fn(
			async (input: {
				readonly mode: string
				readonly proxyUrl?: string
			}): Promise<EgressIdentityObservation> =>
				input.proxyUrl
					? { ip: '203.0.113.41', countryCode: 'DE', provider: 'cloudflare' }
					: { ip: '93.117.45.179', countryCode: 'IR', provider: 'cloudflare' },
		)
		const identity: EgressIdentity = { observe }
		const { result } = renderHook(() =>
			usePostConnectEgressIdentity({
				connectionState: 'connected',
				connectionKey: 'profile-a:vpn:xray',
				mode: 'vpn',
				localPort: 10808,
				egressPath: 'local-proxy',
				identity,
			}),
		)

		await waitFor(() => expect(result.current.status).toBe('available'))
		expect(result.current).toMatchObject({
			observation: { ip: '203.0.113.41', countryCode: 'DE' },
			current: {
				status: 'available',
				observation: { ip: '93.117.45.179', countryCode: 'IR' },
			},
		})
		expect(observe).toHaveBeenCalledWith({
			mode: 'vpn',
			proxyUrl: 'socks5://127.0.0.1:10808',
			signal: expect.any(AbortSignal),
		})
		expect(observe).toHaveBeenCalledWith({
			mode: 'vpn',
			signal: expect.any(AbortSignal),
		})
	})

	it('aborts and discards an older connection generation after a route change', async () => {
		const pending: {
			readonly key: string
			readonly signal: AbortSignal | undefined
			readonly resolve: (value: EgressIdentityObservation) => void
		}[] = []
		const identity: EgressIdentity = {
			observe: vi.fn(
				(input) =>
					new Promise<EgressIdentityObservation>((resolve) => {
						pending.push({
							key: input.proxyUrl ?? 'direct',
							signal: input.signal,
							resolve,
						})
					}),
			),
		}
		const { result, rerender } = renderHook(
			({ connectionKey, localPort }) =>
				usePostConnectEgressIdentity({
					connectionState: 'connected',
					connectionKey,
					mode: 'proxy',
					localPort,
					identity,
				}),
			{
				initialProps: {
					connectionKey: 'profile-a:proxy:sing-box',
					localPort: 10808,
				},
			},
		)
		await waitFor(() => expect(pending).toHaveLength(2))

		rerender({
			connectionKey: 'profile-b:proxy:sing-box',
			localPort: 10809,
		})
		await waitFor(() => expect(pending).toHaveLength(4))
		expect(
			pending.find((entry) => entry.key === 'socks5://127.0.0.1:10808')?.signal
				?.aborted,
		).toBe(true)

		act(() => {
			for (const entry of pending) {
				entry.resolve({
					ip: entry.key === 'socks5://127.0.0.1:10809' ? '203.0.113.2' : '198.51.100.1',
					provider: 'ipify',
				})
			}
		})
		await waitFor(() => expect(result.current.status).toBe('available'))
		expect(result.current).toMatchObject({
			observation: { ip: '203.0.113.2' },
		})
	})

	it('clears the observed address immediately on disconnect', async () => {
		const identity: EgressIdentity = {
			async observe() {
				return { ip: '203.0.113.8', provider: 'ipify' }
			},
		}
		const { result, rerender } = renderHook(
			({ connectionState }) =>
				usePostConnectEgressIdentity({
					connectionState,
					connectionKey: 'profile-a:vpn:xray',
					mode: 'vpn',
					localPort: 10808,
					identity,
				}),
			{ initialProps: { connectionState: 'connected' } },
		)
		await waitFor(() => expect(result.current.status).toBe('available'))

		act(() => rerender({ connectionState: 'disconnected' }))

		expect(result.current).toEqual({ status: 'disconnected' })
	})

	it('keeps connection success while external identity is unavailable', async () => {
		const identity: EgressIdentity = {
			async observe() {
				throw new Error('provider response included a private detail')
			},
		}
		const { result } = renderHook(() =>
			usePostConnectEgressIdentity({
				connectionState: 'connected',
				connectionKey: 'profile-a:vpn:xray',
				mode: 'vpn',
				localPort: 10808,
				identity,
			}),
		)

		await waitFor(() => expect(result.current.status).toBe('unavailable'))
		expect(JSON.stringify(result.current)).not.toContain('private detail')
	})
})
