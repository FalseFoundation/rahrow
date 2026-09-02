import { MAX_SUBSCRIPTION_BYTES } from '@rahrow/core/subscription/subscription-fetch-policy.ts'
import { describe, expect, it, vi } from 'vitest'

import {
	createMobileSubscriptionFetcher,
	type RahRowSubscriptionPlugin,
} from './mobile-subscription-fetcher.ts'

function pluginReturning(
	response: Awaited<ReturnType<RahRowSubscriptionPlugin['fetch']>>,
): RahRowSubscriptionPlugin {
	return { fetch: vi.fn().mockResolvedValue(response) }
}

describe('createMobileSubscriptionFetcher', () => {
	it('captures body and allowlisted metadata in one authenticated native request', async () => {
		const plugin = pluginReturning({
			body: 'vless://profile',
			subscriptionUserinfo: 'upload=1; download=2; total=10; expire=1893456000',
			supportUrl: 'https://support.example.com/help',
			profileWebPageUrl: 'https://account.example.com/profile',
		})
		const fetcher = createMobileSubscriptionFetcher({
			platform: 'android',
			plugin,
			resolveCredential: async (credentialId) => {
				expect(credentialId).toBe('credential-1')
				return 'Bearer secret'
			},
		})

		await expect(
			fetcher.fetchWithMetadata?.({
				id: 'subscription-1',
				url: 'https://example.com/subscription?token=secret',
				credentialId: 'credential-1',
			}),
		).resolves.toEqual({
			body: 'vless://profile',
			metadata: {
				usage: {
					uploadBytes: 1,
					downloadBytes: 2,
					totalBytes: 10,
					expiresAt: '2030-01-01T00:00:00.000Z',
				},
				supportUrl: 'https://support.example.com/help',
				profileUrl: 'https://account.example.com/profile',
			},
		})
		expect(plugin.fetch).toHaveBeenCalledOnce()
		expect(plugin.fetch).toHaveBeenCalledWith({
			url: 'https://example.com/subscription?token=secret',
			authorization: 'Bearer secret',
		})
	})

	it('validates URLs and credentials before invoking the native bridge', async () => {
		const plugin = pluginReturning({ body: '' })
		const fetcher = createMobileSubscriptionFetcher({
			platform: 'ios',
			plugin,
			resolveCredential: async () => 'Bearer secret\nInjected: value',
		})

		await expect(
			fetcher.fetch({ id: 'local', url: 'http://127.0.0.1/subscription' }),
		).rejects.toThrow('Subscription URLs must use HTTPS')
		await expect(
			fetcher.fetch({
				id: 'credentialed',
				url: 'https://example.com/subscription',
				credentialId: 'credential-1',
			}),
		).rejects.toThrow('Subscription credential is invalid')
		expect(plugin.fetch).not.toHaveBeenCalled()
	})

	it('redacts the source URL when the native request fails', async () => {
		const plugin: RahRowSubscriptionPlugin = {
			fetch: vi.fn().mockRejectedValue(new Error('request failed with secret')),
		}
		const fetcher = createMobileSubscriptionFetcher({
			platform: 'android',
			plugin,
		})

		await expect(
			fetcher.fetch({
				id: 'subscription-1',
				url: 'https://example.com/private/path?token=secret',
			}),
		).rejects.toThrow(
			'Failed to fetch https://example.com/[redacted]?token=%5Bredacted%5D',
		)
	})

	it('rechecks the native response byte limit at the TypeScript boundary', async () => {
		const plugin = pluginReturning({
			body: 'a'.repeat(MAX_SUBSCRIPTION_BYTES + 1),
		})
		const fetcher = createMobileSubscriptionFetcher({
			platform: 'ios',
			plugin,
		})

		await expect(
			fetcher.fetch({
				id: 'subscription-1',
				url: 'https://example.com/subscription',
			}),
		).rejects.toThrow('Subscription response is too large')
	})
})
