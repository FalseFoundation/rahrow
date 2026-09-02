import { describe, expect, it, vi } from 'vitest'

import { createMobileEgressIdentity } from './egress-identity.ts'

describe('mobile egress identity', () => {
	it('uses host HTTPS after the native VPN route is active', async () => {
		const fetcher = vi.fn(
			async () => new Response('ip=2001:db8::17\nloc=SE\n', { status: 200 }),
		)
		const identity = createMobileEgressIdentity(fetcher)

		await expect(identity.observe({ mode: 'vpn' })).resolves.toEqual({
			ip: '2001:db8::17',
			countryCode: 'SE',
			provider: 'cloudflare',
		})
	})

	it('uses the native routed requester in proxy mode and never WebView fetch', async () => {
		const fetcher = vi.fn()
		const routedRequest = vi.fn(async () => ({
			status: 200,
			body: 'ip=2001:db8::18\nloc=SE\n',
		}))
		const identity = createMobileEgressIdentity(fetcher, routedRequest)

		await expect(
			identity.observe({
				mode: 'proxy',
				proxyUrl: 'socks5://127.0.0.1:10808',
			}),
		).resolves.toMatchObject({ ip: '2001:db8::18', countryCode: 'SE' })
		expect(routedRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				mode: 'proxy',
				proxyUrl: 'socks5://127.0.0.1:10808',
			}),
		)
		expect(fetcher).not.toHaveBeenCalled()
	})
})
