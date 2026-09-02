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
	})

	it('aborts and discards an older connection generation after a route change', async () => {
		const pending = new Map<
			string,
			{
				readonly signal: AbortSignal | undefined
				readonly resolve: (value: EgressIdentityObservation) => void
			}
		>()
		const identity: EgressIdentity = {
			observe: vi.fn(
				(input) =>
					new Promise<EgressIdentityObservation>((resolve) => {
						pending.set(input.proxyUrl ?? 'vpn', {
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
		await waitFor(() => expect(pending.size).toBe(1))

		rerender({
			connectionKey: 'profile-b:proxy:sing-box',
			localPort: 10809,
		})
		await waitFor(() => expect(pending.size).toBe(2))
		expect(pending.get('socks5://127.0.0.1:10808')?.signal?.aborted).toBe(true)

		act(() => {
			pending.get('socks5://127.0.0.1:10808')?.resolve({
				ip: '198.51.100.1',
				provider: 'ipify',
			})
			pending.get('socks5://127.0.0.1:10809')?.resolve({
				ip: '203.0.113.2',
				provider: 'ipify',
			})
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
