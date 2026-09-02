import type { EgressIdentityRequest } from '@rahrow/core/platform/egress-identity.ts'
import { describe, expect, it, vi } from 'vitest'

import { createDesktopRoutedHttpRequester } from './routed-http.ts'

const proxyRequest: EgressIdentityRequest = {
	url: 'https://www.cloudflare.com/cdn-cgi/trace',
	mode: 'proxy',
	proxyUrl: 'socks5://127.0.0.1:10808',
	signal: new AbortController().signal,
}

describe('desktop routed HTTP requester', () => {
	it('delegates only to the native bounded SOCKS request', async () => {
		const nativeRequest = vi.fn(async () => ({
			status: 200,
			body: 'ip=203.0.113.8',
		}))
		const request = createDesktopRoutedHttpRequester(nativeRequest)

		await expect(request(proxyRequest)).resolves.toEqual({
			status: 200,
			body: 'ip=203.0.113.8',
		})
		expect(nativeRequest).toHaveBeenCalledWith({
			url: proxyRequest.url,
			proxyUrl: proxyRequest.proxyUrl,
			timeoutMs: 8_000,
			maxBytes: 4_096,
		})
	})

	it('rejects cancellation without attempting a direct request', async () => {
		const nativeRequest = vi.fn()
		const request = createDesktopRoutedHttpRequester(nativeRequest)
		const controller = new AbortController()
		controller.abort(new Error('route changed'))

		await expect(
			request({ ...proxyRequest, signal: controller.signal }),
		).rejects.toThrow('route changed')
		expect(nativeRequest).not.toHaveBeenCalled()
	})

	it('forwards an allowlisted byte-count request and its explicit cap', async () => {
		const nativeRequest = vi.fn(async () => ({
			status: 200,
			body: '',
			bytesRead: 1_048_576,
		}))
		const request = createDesktopRoutedHttpRequester(nativeRequest)

		await request({
			...proxyRequest,
			url: 'https://speed.cloudflare.com/__down?bytes=1048576',
			maxBytes: 1_048_576,
			responseMode: 'byte-count',
		})

		expect(nativeRequest).toHaveBeenCalledWith(
			expect.objectContaining({
				maxBytes: 1_048_576,
				responseMode: 'byte-count',
			}),
		)
	})
})
