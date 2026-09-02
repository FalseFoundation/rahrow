import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type {
	AppRuntime,
	ConnectionPort,
	ConnectionSnapshot,
} from './runtime.tsx'
import { useAppShellResources } from './useAppShellResources.ts'

const profile = {
	id: 'shell-profile',
	protocol: 'vless',
	endpoint: { host: 'example.com', port: 443 },
	authentication: { id: '11111111-1111-4111-8111-111111111111' },
} satisfies ConnectionProfile

function runtimeWith(
	connection: ConnectionPort,
	language?: string,
	advertising?: AppRuntime['advertising'],
): AppRuntime {
	const settingsStore = {
		async read() {
			return language ? { language } : {}
		},
		async write() {},
	}
	return {
		advertising,
		connection,
		logger: { warn: vi.fn() },
		settingsStore,
	} as unknown as AppRuntime
}

describe('useAppShellResources', () => {
	afterEach(() => {
		document.documentElement.dataset.connectionState = 'disconnected'
		document.documentElement.lang = 'en'
		document.documentElement.dir = 'ltr'
	})

	it('applies persisted locale and RTL direction during shared shell startup', async () => {
		const runtime = runtimeWith(
			{
				async connect() {},
				async disconnect() {},
				async status() {
					return { state: 'disconnected' }
				},
				async test() {
					return { reachable: false }
				},
			},
			'fa-IR',
		)

		const { result } = renderHook(() => useAppShellResources(runtime))

		await waitFor(() => {
			expect(document.documentElement.lang).toBe('fa')
			expect(document.documentElement.dir).toBe('rtl')
		})
		await act(async () => {
			await result.current.runtime.settingsStore.write({ language: 'en-US' })
		})
		expect(document.documentElement.lang).toBe('en')
		expect(document.documentElement.dir).toBe('ltr')
	})

	it('initializes the document semantic state safely from runtime status', async () => {
		const runtime = runtimeWith({
			async connect() {},
			async disconnect() {},
			async status() {
				return { state: 'connected' }
			},
			async test() {
				return { reachable: false }
			},
		})

		renderHook(() => useAppShellResources(runtime))

		await waitFor(() => {
			expect(document.documentElement.dataset.connectionState).toBe('connected')
		})
	})

	it('fails closed to disconnected when initial status is unavailable', async () => {
		const runtime = runtimeWith({
			async connect() {},
			async disconnect() {},
			async status() {
				throw new Error('native status command missing')
			},
			async test() {
				return { reachable: false }
			},
		})

		renderHook(() => useAppShellResources(runtime))

		await waitFor(() => {
			expect(document.documentElement.dataset.connectionState).toBe('disconnected')
		})
	})

	it('publishes connection changes after shell-observed connect and disconnect actions', async () => {
		let state = 'disconnected'
		const runtime = runtimeWith({
			async connect() {
				state = 'connected'
			},
			async disconnect() {
				state = 'disconnected'
			},
			async status() {
				return { state }
			},
			async test() {
				return { reachable: false }
			},
		})
		const { result } = renderHook(() => useAppShellResources(runtime))

		await act(async () => {
			await result.current.runtime.connection.connect(profile, { mode: 'vpn' })
		})
		expect(document.documentElement.dataset.connectionState).toBe('connected')

		await act(async () => {
			await result.current.runtime.connection.disconnect()
		})
		expect(document.documentElement.dataset.connectionState).toBe('disconnected')
	})

	it('records an ad gate only after connection succeeds', async () => {
		const recordConnectionSuccess = vi.fn(async () => undefined)
		const successfulRuntime = runtimeWith(
			{
				async connect() {},
				async disconnect() {},
				async status() {
					return { state: 'connected' }
				},
				async test() {
					return { reachable: false }
				},
			},
			undefined,
			{
				gate: { recordConnectionSuccess } as never,
				provider: { id: 'test', load: async () => null },
			},
		)
		const { result } = renderHook(() => useAppShellResources(successfulRuntime))

		await act(async () => {
			await result.current.runtime.connection.connect(profile, { mode: 'vpn' })
		})

		expect(recordConnectionSuccess).toHaveBeenCalledOnce()

		const failedRecord = vi.fn(async () => {
			throw new Error('storage unavailable')
		})
		const resilientRuntime = runtimeWith(
			{
				async connect() {},
				async disconnect() {},
				async status() {
					return { state: 'connected' }
				},
				async test() {
					return { reachable: false }
				},
			},
			undefined,
			{
				gate: { recordConnectionSuccess: failedRecord } as never,
				provider: { id: 'test', load: async () => null },
			},
		)
		const resilient = renderHook(() => useAppShellResources(resilientRuntime))

		await expect(
			act(async () => {
				await resilient.result.current.runtime.connection.connect(profile, {
					mode: 'vpn',
				})
			}),
		).resolves.toBeUndefined()

		const failedConnectRecord = vi.fn(async () => undefined)
		const failedRuntime = runtimeWith(
			{
				async connect() {
					throw new Error('engine failed')
				},
				async disconnect() {},
				async status() {
					return { state: 'disconnected' }
				},
				async test() {
					return { reachable: false }
				},
			},
			undefined,
			{
				gate: { recordConnectionSuccess: failedConnectRecord } as never,
				provider: { id: 'test', load: async () => null },
			},
		)
		const failed = renderHook(() => useAppShellResources(failedRuntime))

		await expect(
			act(async () => {
				await failed.result.current.runtime.connection.connect(profile, {
					mode: 'vpn',
				})
			}),
		).rejects.toThrow('engine failed')
		expect(failedConnectRecord).not.toHaveBeenCalled()
	})

	it('uses a live subscription when the connection port provides one', async () => {
		let publish: ((snapshot: ConnectionSnapshot) => void) | undefined
		const unsubscribe = vi.fn()
		const runtime = runtimeWith({
			async connect() {},
			async disconnect() {},
			async status() {
				return { state: 'disconnected' }
			},
			async test() {
				return { reachable: false }
			},
			subscribe(listener) {
				publish = listener
				return unsubscribe
			},
		})
		const { unmount } = renderHook(() => useAppShellResources(runtime))

		act(() => publish?.({ state: 'connected' }))
		expect(document.documentElement.dataset.connectionState).toBe('connected')
		act(() => publish?.({ state: 'connecting' }))
		expect(document.documentElement.dataset.connectionState).toBe('disconnected')
		act(() => publish?.({ state: 'error' }))
		expect(document.documentElement.dataset.connectionState).toBe('disconnected')

		unmount()
		expect(unsubscribe).toHaveBeenCalledOnce()
		expect(document.documentElement.dataset.connectionState).toBe('disconnected')
	})

	it('creates one QueryClient per runtime rather than sharing module state', () => {
		const connection: ConnectionPort = {
			async connect() {},
			async disconnect() {},
			async status() {
				return { state: 'disconnected' }
			},
			async test() {
				return { reachable: false }
			},
		}
		const firstRuntime = runtimeWith(connection)
		const secondRuntime = runtimeWith(connection)
		const { result, rerender } = renderHook(
			({ runtime }: { runtime: AppRuntime }) => useAppShellResources(runtime),
			{ initialProps: { runtime: firstRuntime } },
		)
		const firstClient = result.current.queryClient

		rerender({ runtime: firstRuntime })
		expect(result.current.queryClient).toBe(firstClient)

		rerender({ runtime: secondRuntime })
		expect(result.current.queryClient).not.toBe(firstClient)
	})
})
