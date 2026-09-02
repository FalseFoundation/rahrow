import type { EgressIdentityRequest } from '@rahrow/core/platform/egress-identity.ts'
import { describe, expect, it, vi } from 'vitest'

import { createMobileRoutedHttpRequester } from './routed-http.ts'

const proxyRequest: EgressIdentityRequest = {
	url: 'https://speed.cloudflare.com/__down?bytes=0',
	mode: 'proxy',
	proxyUrl: 'socks5://127.0.0.1:10808',
	signal: new AbortController().signal,
}

describe('mobile routed HTTP requester', () => {
	it.each(['android', 'ios'] as const)(
		'uses the native per-request SOCKS bridge on %s',
		async (platform) => {
			const plugin = {
				request: vi.fn(async () => ({ status: 204, body: '' })),
			}
			const request = createMobileRoutedHttpRequester({ platform, plugin })

			await expect(request(proxyRequest)).resolves.toEqual({
				status: 204,
				body: '',
			})
			expect(plugin.request).toHaveBeenCalledWith({
				url: proxyRequest.url,
				proxyUrl: proxyRequest.proxyUrl,
				timeoutMs: 8_000,
				maxBytes: 4_096,
			})
		},
	)

	it('fails closed on web without calling a native bridge', async () => {
		const plugin = { request: vi.fn() }
		const request = createMobileRoutedHttpRequester({ platform: 'web', plugin })

		await expect(request(proxyRequest)).rejects.toThrow(
			'Mobile proxy-routed HTTP is unavailable',
		)
		expect(plugin.request).not.toHaveBeenCalled()
	})

	it('forwards an allowlisted byte-count request and its explicit cap', async () => {
		const plugin = {
			request: vi.fn(async () => ({
				status: 200,
				body: '',
				bytesRead: 1_048_576,
			})),
		}
		const request = createMobileRoutedHttpRequester({
			platform: 'android',
			plugin,
		})

		await request({
			...proxyRequest,
			url: 'https://speed.cloudflare.com/__down?bytes=1048576',
			maxBytes: 1_048_576,
			responseMode: 'byte-count',
		})

		expect(plugin.request).toHaveBeenCalledWith(
			expect.objectContaining({
				maxBytes: 1_048_576,
				responseMode: 'byte-count',
			}),
		)
	})
})
