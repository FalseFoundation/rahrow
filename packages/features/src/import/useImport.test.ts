import { createLogBuffer } from '@rahrow/core/logging/log-buffer.ts'
import { createPinoLogger } from '@rahrow/core/logging/pino-logger.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { defaultProtocolRegistry } from '@rahrow/core/protocol/connection-protocol.ts'
import type { ProxyEngine } from '@rahrow/core/runtime/proxy-engine.ts'
import {
	JsonProfileStore,
	JsonSettingsStore,
	MemoryDocumentStore,
} from '@rahrow/core/storage/json-store.ts'
import { JsonSubscriptionStore } from '@rahrow/core/storage/subscription-store.ts'
import { httpSubscriptionFetcher } from '@rahrow/core/subscription/http-subscription-fetcher.ts'
import type { SubscriptionFetcher } from '@rahrow/core/subscription/subscription-import.ts'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	type AppRuntime,
	AppRuntimeProvider,
	type ConnectionPort,
} from '../app/runtime.tsx'
import { useImport } from './useImport.ts'

const scannedVless =
	'vless://11111111-1111-4111-8111-111111111111@example.com:443?security=tls#Scanned'

const idleEngine: ProxyEngine = {
	id: 'xray',
	manifest: {
		id: 'xray',
		supportedProtocols: ['vless', 'vmess', 'trojan'],
	},
	async start() {},
	async stop() {},
	async restart() {},
	async status() {
		return { status: 'stopped', checkedAt: '2026-01-01T00:00:00.000Z' }
	},
	async test() {
		return {
			profileId: 'unused',
			reachable: false,
			checkedAt: '2026-01-01T00:00:00.000Z',
		}
	},
}

function createRuntime(
	subscriptionFetcher: SubscriptionFetcher = httpSubscriptionFetcher,
): AppRuntime {
	const logs = createLogBuffer()
	const qrDecoder = {
		decode: vi.fn(async () => scannedVless),
	}

	return {
		profileStore: new JsonProfileStore(new MemoryDocumentStore()),
		settingsStore: new JsonSettingsStore(new MemoryDocumentStore()),
		subscriptionStore: new JsonSubscriptionStore(new MemoryDocumentStore()),
		registry: defaultProtocolRegistry,
		engine: idleEngine,
		connection: {
			async connect() {},
			async disconnect() {},
			async status() {
				return { state: 'disconnected' }
			},
			async test() {
				return { reachable: false }
			},
		} satisfies ConnectionPort,
		capabilities: {
			clipboard: {
				async read() {
					return ''
				},
				async write() {},
			},
			share: {
				async share() {},
			},
			qrEncoder: {
				async encode(value) {
					return value
				},
			},
			qrDecoder,
		},
		diagnostics: {
			async snapshot() {
				return { capabilities: [] }
			},
		},
		subscriptionFetcher,
		logger: createPinoLogger({ destination: logs, level: 'debug' }),
		logs,
	}
}

describe('useImport', () => {
	it('keeps its public surface focused on acquiring connections', () => {
		const runtime = createRuntime()
		const { result } = renderHook(() => useImport(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})

		expect(result.current.state).not.toHaveProperty('qrDataUrl')
		expect(result.current.actions).not.toHaveProperty('copyValue')
		expect(result.current.actions).not.toHaveProperty('shareValue')
		expect(result.current.actions).not.toHaveProperty('encodeQr')
	})

	it('imports a scanned QR payload through the shared import pipeline', async () => {
		const runtime = createRuntime()
		const { result } = renderHook(() => useImport(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})

		expect(result.current.state.decodeSupported).toBe(true)

		await result.current.actions.decodeQr()

		await expect(runtime.profileStore.list()).resolves.toEqual([
			expect.objectContaining({
				protocol: 'vless',
				endpoint: { host: 'example.com', port: 443 },
				metadata: expect.objectContaining({ source: 'qr' }),
			} satisfies Partial<ConnectionProfile>),
		])
		await waitFor(() => {
			expect(result.current.state.value).toBe(scannedVless)
			expect(result.current.state.message).toBe('1 profile imported')
		})
		expect(runtime.logs.records()).toContainEqual(
			expect.objectContaining({
				module: 'user-action',
				msg: 'Imported 1 profile from qr',
				bindings: expect.objectContaining({
					action: 'profile.import',
					outcome: 'success',
					source: 'qr',
				}),
			}),
		)
	})

	it('keeps native import failures out of user-facing copy', async () => {
		const runtime = createRuntime({
			async fetch() {
				throw { message: 'command rahrow_http_get not found' }
			},
		})
		const { result } = renderHook(() => useImport(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})

		act(() => {
			result.current.actions.setValue(
				'https://sub.example.com/api/v1/client/subscribe?token=abc',
			)
		})
		await waitFor(() => {
			expect(result.current.state.value).toContain('https://')
		})
		await expect(result.current.actions.importPasted()).rejects.toMatchObject({
			message: 'command rahrow_http_get not found',
		})

		await waitFor(() => {
			expect(result.current.state.message).toBe('Import failed')
		})
	})

	it('fetches a pasted https subscription URL before parsing profiles', async () => {
		const body = [
			'vless://11111111-1111-4111-8111-111111111111@example.com:443?security=tls#One',
			'trojan://secret@example.net:8443?security=tls#Two',
		].join('\n')
		const runtime = createRuntime({
			async fetch(subscription) {
				expect(subscription.url).toBe(
					'https://sub.example.com/api/v1/client/subscribe?token=abc',
				)

				return body
			},
		})

		const { result } = renderHook(() => useImport(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})

		act(() => {
			result.current.actions.setValue(
				'https://sub.example.com/api/v1/client/subscribe?token=abc',
			)
		})
		await waitFor(() => {
			expect(result.current.state.value).toBe(
				'https://sub.example.com/api/v1/client/subscribe?token=abc',
			)
		})
		await result.current.actions.importPasted()

		await expect(runtime.profileStore.list()).resolves.toHaveLength(2)
		await waitFor(() => {
			expect(result.current.state.message).toBe('2 profiles imported')
		})
	})
})
