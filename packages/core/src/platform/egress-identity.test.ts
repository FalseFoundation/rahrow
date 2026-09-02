import { describe, expect, it, vi } from 'vitest'

import {
	createEgressIdentity,
	type EgressIdentityRequest,
	readBoundedEgressResponse,
} from './egress-identity.ts'

describe('egress identity', () => {
	it('rejects an oversized response before retaining its full body', async () => {
		await expect(
			readBoundedEgressResponse(new Response('x'.repeat(4_097))),
		).rejects.toThrow('External IP response is too large')
		await expect(
			readBoundedEgressResponse(
				new Response('small', { headers: { 'content-length': '4097' } }),
			),
		).rejects.toThrow('External IP response is too large')
	})

	it('observes and validates the exit address and ISO country through Cloudflare', async () => {
		const request = vi.fn(async (_input: EgressIdentityRequest) => ({
			status: 200,
			body: 'fl=29f\nip=203.0.113.7\nloc=NL\nwarp=off\n',
		}))
		const identity = createEgressIdentity({ request })

		await expect(identity.observe({ mode: 'vpn' })).resolves.toEqual({
			ip: '203.0.113.7',
			countryCode: 'NL',
			provider: 'cloudflare',
		})
		expect(request).toHaveBeenCalledWith(
			expect.objectContaining({
				url: 'https://www.cloudflare.com/cdn-cgi/trace',
				mode: 'vpn',
				signal: expect.any(AbortSignal),
			}),
		)
	})

	it('falls back to ipify and omits country when Cloudflare is malformed', async () => {
		const request = vi
			.fn<
				(input: EgressIdentityRequest) => Promise<{
					status: number
					body: string
				}>
			>()
			.mockResolvedValueOnce({ status: 200, body: 'ip=not-an-ip\nloc=ZZ\n' })
			.mockResolvedValueOnce({
				status: 200,
				body: '{"ip":"2001:db8::7"}',
			})
		const identity = createEgressIdentity({ request })

		await expect(identity.observe({ mode: 'vpn' })).resolves.toEqual({
			ip: '2001:db8::7',
			provider: 'ipify',
		})
		expect(request.mock.calls.map(([input]) => input.url)).toEqual([
			'https://www.cloudflare.com/cdn-cgi/trace',
			'https://api64.ipify.org?format=json',
		])
	})

	it('passes proxy routing requirements to every provider request', async () => {
		const request = vi.fn(async () => ({
			status: 200,
			body: 'ip=203.0.113.9\nloc=DE\n',
		}))
		const identity = createEgressIdentity({ request })

		await identity.observe({
			mode: 'proxy',
			proxyUrl: 'socks5://127.0.0.1:10808',
		})

		expect(request).toHaveBeenCalledWith(
			expect.objectContaining({
				mode: 'proxy',
				proxyUrl: 'socks5://127.0.0.1:10808',
			}),
		)
	})

	it('fails closed before HTTP when proxy routing details are absent', async () => {
		const request = vi.fn()
		const identity = createEgressIdentity({ request })

		await expect(identity.observe({ mode: 'proxy' })).rejects.toThrow(
			'External IP is unavailable',
		)
		expect(request).not.toHaveBeenCalled()
	})

	it('aborts timeout-bounded requests and never retries after caller cancellation', async () => {
		vi.useFakeTimers()
		try {
			const request = vi.fn(
				(input: EgressIdentityRequest) =>
					new Promise<never>((_resolve, reject) => {
						input.signal.addEventListener('abort', () => reject(input.signal.reason))
					}),
			)
			const identity = createEgressIdentity({ request, timeoutMs: 50 })
			const observation = identity.observe({ mode: 'vpn' })
			const timedOut = expect(observation).rejects.toThrow(
				'External IP is unavailable',
			)

			await vi.advanceTimersByTimeAsync(100)
			await timedOut
			expect(request).toHaveBeenCalledTimes(2)

			const controller = new AbortController()
			const canceled = identity.observe({ mode: 'vpn', signal: controller.signal })
			controller.abort(new Error('route changed'))
			await expect(canceled).rejects.toThrow('route changed')
			expect(request).toHaveBeenCalledTimes(3)
		} finally {
			vi.useRealTimers()
		}
	})
})
