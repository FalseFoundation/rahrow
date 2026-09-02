import type { ConnectionMode } from '../connection/connection-mode.ts'
import type { EgressIdentityRequester } from '../platform/egress-identity.ts'

export const CLOUDFLARE_NETWORK_TEST_URL =
	'https://speed.cloudflare.com/__down?bytes=0'
/** Automatic throughput is capped at exactly 1 MiB to limit mobile data use. */
export const CLOUDFLARE_DOWNLOAD_SAMPLE_BYTES = 1_048_576
export const CLOUDFLARE_DOWNLOAD_TEST_URL = `https://speed.cloudflare.com/__down?bytes=${CLOUDFLARE_DOWNLOAD_SAMPLE_BYTES}`
export const DEFAULT_NETWORK_TEST_TIMEOUT_MS = 8_000

export interface NetworkQualityResult {
	readonly provider: 'cloudflare'
	readonly reachable: boolean
	readonly latencyMs?: number
	readonly downloadMbps?: number
	readonly downloadBytes?: number
	readonly downloadError?: 'download-test-unavailable'
	readonly error?: 'network-test-unavailable'
}

export interface NetworkQualityProbe {
	test(options?: {
		readonly signal?: AbortSignal
		readonly mode?: ConnectionMode
		readonly proxyUrl?: string
	}): Promise<NetworkQualityResult>
}

export interface CloudflareNetworkQualityProbeOptions {
	readonly request?: typeof globalThis.fetch
	readonly routedRequest?: EgressIdentityRequester
	readonly now?: () => number
	readonly timeoutMs?: number
}

/**
 * Runs a zero-byte Cloudflare latency check followed by an automatic download
 * estimate capped at exactly 1 MiB. Latency and throughput are separate metrics.
 */
export function createCloudflareNetworkQualityProbe(
	options: CloudflareNetworkQualityProbeOptions = {},
): NetworkQualityProbe {
	const request = options.request ?? globalThis.fetch
	const now = options.now ?? (() => performance.now())
	const timeoutMs = options.timeoutMs ?? DEFAULT_NETWORK_TEST_TIMEOUT_MS
	if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
		throw new Error('Network test timeout must be a positive number')
	}

	return {
		async test(testOptions = {}) {
			if (
				testOptions.mode === 'proxy' &&
				(!options.routedRequest || !testOptions.proxyUrl?.trim())
			) {
				return unavailableResult()
			}
			const controller = new AbortController()
			const forwardAbort = () => controller.abort(testOptions.signal?.reason)
			if (testOptions.signal?.aborted) forwardAbort()
			else
				testOptions.signal?.addEventListener('abort', forwardAbort, { once: true })

			const timeout = setTimeout(() => controller.abort(), timeoutMs)
			const latencyStartedAt = now()
			try {
				const readinessStatus = await requestStatus({
					url: CLOUDFLARE_NETWORK_TEST_URL,
					...(testOptions.mode ? { mode: testOptions.mode } : {}),
					...(testOptions.proxyUrl ? { proxyUrl: testOptions.proxyUrl } : {}),
					signal: controller.signal,
					request,
					...(options.routedRequest ? { routedRequest: options.routedRequest } : {}),
				})
				if (!readinessStatus) return unavailableResult()
				const latencyMs = Math.max(0, Math.round(now() - latencyStartedAt))

				const downloadStartedAt = now()
				try {
					const downloadBytes = await requestDownloadBytes({
						...(testOptions.mode ? { mode: testOptions.mode } : {}),
						...(testOptions.proxyUrl ? { proxyUrl: testOptions.proxyUrl } : {}),
						signal: controller.signal,
						request,
						...(options.routedRequest
							? { routedRequest: options.routedRequest }
							: {}),
					})
					const elapsedMs = Math.max(1, now() - downloadStartedAt)
					return {
						provider: 'cloudflare',
						reachable: true,
						latencyMs,
						downloadMbps: roundMbps(downloadBytes, elapsedMs),
						downloadBytes,
					}
				} catch {
					return {
						provider: 'cloudflare',
						reachable: true,
						latencyMs,
						downloadError: 'download-test-unavailable',
					}
				}
			} catch {
				return unavailableResult()
			} finally {
				clearTimeout(timeout)
				testOptions.signal?.removeEventListener('abort', forwardAbort)
			}
		},
	}
}

async function requestStatus(input: {
	readonly url: string
	readonly mode?: ConnectionMode
	readonly proxyUrl?: string
	readonly signal: AbortSignal
	readonly request: typeof globalThis.fetch
	readonly routedRequest?: EgressIdentityRequester
}): Promise<boolean> {
	if (input.mode === 'proxy') {
		const response = await input.routedRequest?.({
			url: input.url,
			mode: 'proxy',
			...(input.proxyUrl ? { proxyUrl: input.proxyUrl } : {}),
			signal: input.signal,
		})
		return Boolean(response && response.status >= 200 && response.status < 300)
	}
	const response = await input.request(input.url, {
		cache: 'no-store',
		redirect: 'error',
		signal: input.signal,
	})
	return response.ok
}

async function requestDownloadBytes(input: {
	readonly mode?: ConnectionMode
	readonly proxyUrl?: string
	readonly signal: AbortSignal
	readonly request: typeof globalThis.fetch
	readonly routedRequest?: EgressIdentityRequester
}): Promise<number> {
	if (input.mode === 'proxy') {
		const response = await input.routedRequest?.({
			url: CLOUDFLARE_DOWNLOAD_TEST_URL,
			mode: 'proxy',
			...(input.proxyUrl ? { proxyUrl: input.proxyUrl } : {}),
			signal: input.signal,
			maxBytes: CLOUDFLARE_DOWNLOAD_SAMPLE_BYTES,
			responseMode: 'byte-count',
		})
		if (
			!response ||
			response.status < 200 ||
			response.status >= 300 ||
			!validDownloadSize(response.bytesRead)
		) {
			throw new Error('Cloudflare download sample is unavailable')
		}
		return response.bytesRead
	}

	const response = await input.request(CLOUDFLARE_DOWNLOAD_TEST_URL, {
		cache: 'no-store',
		redirect: 'error',
		signal: input.signal,
	})
	if (!response.ok) throw new Error('Cloudflare download sample is unavailable')
	return await readBoundedByteCount(response, CLOUDFLARE_DOWNLOAD_SAMPLE_BYTES)
}

async function readBoundedByteCount(
	response: Response,
	cap: number,
): Promise<number> {
	const declared = Number(response.headers.get('content-length'))
	if (Number.isFinite(declared) && declared > cap) {
		throw new Error('Cloudflare download sample exceeded its cap')
	}
	if (!response.body) throw new Error('Cloudflare download sample was empty')
	const reader = response.body.getReader()
	let bytesRead = 0
	try {
		while (true) {
			const chunk = await reader.read()
			if (chunk.done) break
			bytesRead += chunk.value.byteLength
			if (bytesRead > cap) {
				await reader.cancel()
				throw new Error('Cloudflare download sample exceeded its cap')
			}
		}
	} finally {
		reader.releaseLock()
	}
	if (!validDownloadSize(bytesRead)) {
		throw new Error('Cloudflare download sample was empty')
	}
	return bytesRead
}

function validDownloadSize(value: unknown): value is number {
	return (
		typeof value === 'number' &&
		Number.isInteger(value) &&
		value === CLOUDFLARE_DOWNLOAD_SAMPLE_BYTES
	)
}

function roundMbps(bytes: number, elapsedMs: number): number {
	return Math.round(((bytes * 8) / (elapsedMs / 1_000) / 1_000_000) * 100) / 100
}

function unavailableResult(): NetworkQualityResult {
	return {
		provider: 'cloudflare',
		reachable: false,
		error: 'network-test-unavailable',
	}
}
