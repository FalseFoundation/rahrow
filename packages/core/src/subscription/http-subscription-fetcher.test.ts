import { describe, expect, it, vi } from 'vitest'

import {
	createFetchSubscriptionTransport,
	createHttpSubscriptionFetcher,
} from './http-subscription-fetcher.ts'

describe('createHttpSubscriptionFetcher', () => {
	it('uses strict redirect and size policy without leaking URL credentials', async () => {
		const fetch = vi.fn(
			async () =>
				new Response('ok', { status: 500, headers: { 'content-length': '2' } }),
		)
		const fetcher = createHttpSubscriptionFetcher({
			transport: createFetchSubscriptionTransport(fetch),
		})

		await expect(
			fetcher.fetch({
				id: 'sub-1',
				url: 'https://sub.example.com/list?token=secret',
			}),
		).rejects.not.toThrow('secret')
		expect(fetch).toHaveBeenCalledWith(
			'https://sub.example.com/list?token=secret',
			expect.objectContaining({ redirect: 'error' }),
		)
	})

	it('adds credentials only through an injected resolver', async () => {
		const fetch = vi.fn(async () => new Response('profile'))
		const fetcher = createHttpSubscriptionFetcher({
			transport: createFetchSubscriptionTransport(fetch),
			async resolveCredential(id) {
				expect(id).toBe('credential-1')
				return 'Bearer secret'
			},
		})

		await fetcher.fetch({
			id: 'sub-1',
			url: 'https://sub.example.com/list',
			credentialId: 'credential-1',
		})

		expect(fetch).toHaveBeenCalledWith(
			'https://sub.example.com/list',
			expect.objectContaining({
				headers: expect.objectContaining({ Authorization: 'Bearer secret' }),
			}),
		)
	})

	it('forwards cancellation to the HTTP transport', async () => {
		const fetch = vi.fn(async () => new Response('profile'))
		const fetcher = createHttpSubscriptionFetcher({
			transport: createFetchSubscriptionTransport(fetch),
		})
		const controller = new AbortController()

		await fetcher.fetch(
			{ id: 'sub-1', url: 'https://sub.example.com/list' },
			{ signal: controller.signal },
		)

		expect(fetch).toHaveBeenCalledWith(
			'https://sub.example.com/list',
			expect.objectContaining({ signal: controller.signal }),
		)
	})

	it('captures usage metadata from the same response', async () => {
		const fetcher = createHttpSubscriptionFetcher({
			transport: createFetchSubscriptionTransport(
				async () =>
					new Response('profile', {
						headers: {
							'Subscription-Userinfo':
								'upload=100; download=200; total=1000; expire=1789327611',
						},
					}),
			),
		})

		const result = await fetcher.fetchWithMetadata?.({
			id: 'sub-1',
			url: 'https://sub.example.com/list',
		})

		expect(result).toMatchObject({
			body: 'profile',
			metadata: {
				usage: {
					uploadBytes: 100,
					downloadBytes: 200,
					totalBytes: 1000,
				},
			},
		})
	})

	it('omits authorization for public subscriptions', async () => {
		const fetch = vi.fn(async () => new Response('profile'))
		const resolveCredential = vi.fn(async () => 'Bearer unused')
		const fetcher = createHttpSubscriptionFetcher({
			transport: createFetchSubscriptionTransport(fetch),
			resolveCredential,
		})

		await fetcher.fetch({
			id: 'sub-1',
			url: 'https://sub.example.com/list',
		})

		expect(resolveCredential).not.toHaveBeenCalled()
		const headers = new Headers(fetch.mock.calls[0]?.[1]?.headers)
		expect(headers.get('authorization')).toBeNull()
		expect(headers.get('user-agent')).toBe('RahRow/0.0.0')
	})

	it('rejects unavailable or injectable credentials without leaking them', async () => {
		const fetch = vi.fn(async () => new Response('profile'))
		const subscription = {
			id: 'sub-1',
			url: 'https://sub.example.com/private?token=url-secret',
			credentialId: 'credential-1',
		}

		await expect(
			createHttpSubscriptionFetcher({
				transport: createFetchSubscriptionTransport(fetch),
				resolveCredential: async () => undefined,
			}).fetch(subscription),
		).rejects.toThrow('Subscription credential is unavailable')
		await expect(
			createHttpSubscriptionFetcher({
				transport: createFetchSubscriptionTransport(fetch),
				resolveCredential: async () => 'Bearer secret\r\nInjected: yes',
			}).fetch(subscription),
		).rejects.toThrow('Subscription credential is invalid')
		expect(fetch).not.toHaveBeenCalled()
	})

	it('redacts transport errors instead of exposing URLs or authorization', async () => {
		const fetcher = createHttpSubscriptionFetcher({
			transport: {
				async request(input) {
					throw new Error(`${input.url} ${input.headers.Authorization}`)
				},
			},
			resolveCredential: async () => 'Bearer credential-secret',
		})

		const error = await fetcher
			.fetch({
				id: 'sub-1',
				url: 'https://sub.example.com/private?token=url-secret',
				credentialId: 'credential-1',
			})
			.catch((cause: unknown) => String(cause))

		expect(error).toContain(
			'https://sub.example.com/[redacted]?token=%5Bredacted%5D',
		)
		expect(error).not.toContain('url-secret')
		expect(error).not.toContain('credential-secret')
	})
})
