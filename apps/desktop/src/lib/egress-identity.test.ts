import { describe, expect, it, vi } from 'vitest'

import { createDesktopEgressIdentity } from './egress-identity.ts'

describe('desktop egress identity', () => {
	it('uses host HTTPS after the VPN route is active', async () => {
		const fetcher = vi.fn(
			async () => new Response('ip=203.0.113.17\nloc=FI\n', { status: 200 }),
		)
		const identity = createDesktopEgressIdentity(fetcher)

		await expect(identity.observe({ mode: 'vpn' })).resolves.toEqual({
			ip: '203.0.113.17',
			countryCode: 'FI',
			provider: 'cloudflare',
		})
		expect(fetcher).toHaveBeenCalledWith(
			'https://www.cloudflare.com/cdn-cgi/trace',
			expect.objectContaining({
				cache: 'no-store',
				credentials: 'omit',
				redirect: 'error',
			}),
		)
	})

	it('uses the native routed requester in proxy mode and never the WebView', async () => {
		const fetcher = vi.fn()
		const routedRequest = vi.fn(async () => ({
			status: 200,
			body: 'ip=203.0.113.18\nloc=DE\n',
		}))
		const identity = createDesktopEgressIdentity(fetcher, routedRequest)

		await expect(
			identity.observe({
				mode: 'proxy',
				proxyUrl: 'socks5://127.0.0.1:10808',
			}),
		).resolves.toMatchObject({ ip: '203.0.113.18', countryCode: 'DE' })
		expect(routedRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				mode: 'proxy',
				proxyUrl: 'socks5://127.0.0.1:10808',
			}),
		)
		expect(fetcher).not.toHaveBeenCalled()
	})
})
