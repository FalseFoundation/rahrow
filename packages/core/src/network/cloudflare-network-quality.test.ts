import { describe, expect, it, vi } from 'vitest'
import type { EgressIdentityRequest } from '../platform/egress-identity.ts'

import {
	CLOUDFLARE_DOWNLOAD_SAMPLE_BYTES,
	CLOUDFLARE_DOWNLOAD_TEST_URL,
	CLOUDFLARE_NETWORK_TEST_URL,
	createCloudflareNetworkQualityProbe,
} from './cloudflare-network-quality.ts'

describe('createCloudflareNetworkQualityProbe', () => {
	it('rejects invalid timeout configuration', () => {
		expect(() => createCloudflareNetworkQualityProbe({ timeoutMs: 0 })).toThrow(
			'Network test timeout must be a positive number',
		)
		expect(() =>
			createCloudflareNetworkQualityProbe({ timeoutMs: Number.NaN }),
		).toThrow('Network test timeout must be a positive number')
	})

	it('reports latency and a separately bounded Cloudflare download estimate', async () => {
		const request = vi.fn(
			async (url: string | URL | Request) =>
				new Response(
					String(url) === CLOUDFLARE_DOWNLOAD_TEST_URL
						? new Uint8Array(CLOUDFLARE_DOWNLOAD_SAMPLE_BYTES)
						: null,
					{ status: 200 },
				),
		)
		const timestamps = [1_000, 1_042, 2_000, 3_000]
		const probe = createCloudflareNetworkQualityProbe({
			request,
			now: () => timestamps.shift() ?? 3_000,
		})

		await expect(probe.test()).resolves.toEqual({
			provider: 'cloudflare',
			reachable: true,
			latencyMs: 42,
			downloadMbps: 8.39,
			downloadBytes: CLOUDFLARE_DOWNLOAD_SAMPLE_BYTES,
		})
		expect(request).toHaveBeenNthCalledWith(
			1,
			CLOUDFLARE_NETWORK_TEST_URL,
			expect.objectContaining({
				cache: 'no-store',
				redirect: 'error',
				signal: expect.any(AbortSignal),
			}),
		)
		expect(request).toHaveBeenNthCalledWith(
			2,
			CLOUDFLARE_DOWNLOAD_TEST_URL,
			expect.objectContaining({ signal: expect.any(AbortSignal) }),
		)
	})

	it('keeps successful latency when the bounded download sample fails', async () => {
		const request = vi
			.fn()
			.mockResolvedValueOnce(new Response(null, { status: 200 }))
			.mockResolvedValueOnce(new Response(null, { status: 503 }))
		const timestamps = [10, 30, 30]
		const probe = createCloudflareNetworkQualityProbe({
			request,
			now: () => timestamps.shift() ?? 30,
		})

		await expect(probe.test()).resolves.toEqual({
			provider: 'cloudflare',
			reachable: true,
			latencyMs: 20,
			downloadError: 'download-test-unavailable',
		})
	})

	it('returns an unavailable result without exposing transport details', async () => {
		const probe = createCloudflareNetworkQualityProbe({
			request: async () => {
				throw new Error('https://secret.invalid/?token=private')
			},
		})

		await expect(probe.test()).resolves.toEqual({
			provider: 'cloudflare',
			reachable: false,
			error: 'network-test-unavailable',
		})
	})

	it('fails closed in proxy mode unless the requester proves proxy routing', async () => {
		const request = vi.fn(async () => new Response(null, { status: 200 }))
		const probe = createCloudflareNetworkQualityProbe({ request })

		await expect(probe.test({ mode: 'proxy' })).resolves.toEqual({
			provider: 'cloudflare',
			reachable: false,
			error: 'network-test-unavailable',
		})
		expect(request).not.toHaveBeenCalled()

		const routedRequest = vi.fn(async (input: EgressIdentityRequest) => ({
			status: 200,
			body: '',
			...(input.responseMode === 'byte-count'
				? { bytesRead: CLOUDFLARE_DOWNLOAD_SAMPLE_BYTES }
				: {}),
		}))
		const proxyRouted = createCloudflareNetworkQualityProbe({
			routedRequest,
		})
		await expect(
			proxyRouted.test({
				mode: 'proxy',
				proxyUrl: 'socks5://127.0.0.1:10808',
			}),
		).resolves.toMatchObject({
			reachable: true,
		})
		expect(routedRequest).toHaveBeenNthCalledWith(
			1,
			expect.objectContaining({
				url: CLOUDFLARE_NETWORK_TEST_URL,
				mode: 'proxy',
				proxyUrl: 'socks5://127.0.0.1:10808',
				signal: expect.any(AbortSignal),
			}),
		)
		expect(routedRequest).toHaveBeenNthCalledWith(
			2,
			expect.objectContaining({
				url: CLOUDFLARE_DOWNLOAD_TEST_URL,
				maxBytes: CLOUDFLARE_DOWNLOAD_SAMPLE_BYTES,
				responseMode: 'byte-count',
				mode: 'proxy',
			}),
		)
		expect(request).not.toHaveBeenCalled()
	})

	it('forwards caller cancellation', async () => {
		const request = vi.fn(async () => new Response(null, { status: 200 }))
		const probe = createCloudflareNetworkQualityProbe({ request })
		const controller = new AbortController()
		controller.abort()

		await probe.test({ signal: controller.signal })

		expect(request.mock.calls[0]?.[1]?.signal.aborted).toBe(true)
	})

	it('treats non-success responses as unavailable', async () => {
		const probe = createCloudflareNetworkQualityProbe({
			request: async () => new Response(null, { status: 503 }),
		})

		await expect(probe.test()).resolves.toMatchObject({
			provider: 'cloudflare',
			reachable: false,
		})
	})
})
