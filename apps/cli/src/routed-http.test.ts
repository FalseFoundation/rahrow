import { describe, expect, it } from 'vitest'

import { createCliRoutedHttpRequester } from './routed-http.ts'

describe('CLI routed HTTP requester', () => {
	it('fails closed because the Node runtime has no trusted SOCKS dispatcher', async () => {
		const request = createCliRoutedHttpRequester()

		await expect(
			request({
				url: 'https://www.cloudflare.com/cdn-cgi/trace',
				mode: 'proxy',
				proxyUrl: 'socks5://127.0.0.1:10808',
				signal: new AbortController().signal,
			}),
		).rejects.toThrow('CLI proxy-routed HTTP is unavailable')
	})
})
