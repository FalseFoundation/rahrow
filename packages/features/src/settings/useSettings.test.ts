import { createLogBuffer } from '@rahrow/core/logging/log-buffer.ts'
import { createPinoLogger } from '@rahrow/core/logging/pino-logger.ts'
import { defaultProtocolRegistry } from '@rahrow/core/protocol/connection-protocol.ts'
import type { ProxyEngine } from '@rahrow/core/runtime/proxy-engine.ts'
import {
	JsonProfileStore,
	JsonSettingsStore,
	MemoryDocumentStore,
} from '@rahrow/core/storage/json-store.ts'
import { JsonSubscriptionStore } from '@rahrow/core/storage/subscription-store.ts'
import { httpSubscriptionFetcher } from '@rahrow/core/subscription/http-subscription-fetcher.ts'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { changeAppLanguage } from '../app/app-i18n.tsx'
import { type AppRuntime, AppRuntimeProvider } from '../app/runtime.tsx'
import { useSettings } from './useSettings.ts'

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

function createRuntime(overrides: Partial<AppRuntime> = {}): AppRuntime {
	const logs = createLogBuffer()
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
		},
		capabilities: {
			clipboard: {
				async read() {
					return ''
				},
				async write() {},
			},
			share: { async share() {} },
			qrEncoder: {
				async encode(value) {
					return value
				},
			},
		},
		diagnostics: {
			async snapshot() {
				return { capabilities: [] }
			},
		},
		subscriptionFetcher: httpSubscriptionFetcher,
		logger: createPinoLogger({ destination: logs, level: 'debug' }),
		logs,
		...overrides,
	}
}

describe('useSettings', () => {
	it('does not expose loaded settings until initialization completes', async () => {
		let resolveRead: ((value: { readonly localPort: number }) => void) | undefined
		const read = vi.fn(
			() =>
				new Promise<{ readonly localPort: number }>((resolve) => {
					resolveRead = resolve
				}),
		)
		const runtime = createRuntime({
			settingsStore: { read, write: vi.fn() },
		})
		const { result } = renderHook(() => useSettings(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})

		expect(result.current.state.isLoading).toBe(true)

		act(() => resolveRead?.({ localPort: 12080 }))
		await waitFor(() => expect(result.current.state.isLoading).toBe(false))
		expect(result.current.state.localPort).toBe('12080')
	})

	it('reports initialization failures and offers another load attempt', async () => {
		const read = vi
			.fn()
			.mockRejectedValueOnce(new Error('settings document is unreadable'))
			.mockResolvedValueOnce({ localPort: 12080 })
		const runtime = createRuntime({ settingsStore: { read, write: vi.fn() } })
		const { result } = renderHook(() => useSettings(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})

		await waitFor(() => expect(result.current.state.loadError).toBeTruthy())
		expect(result.current.state.message).toBe(
			"Couldn't load settings. The settings store did not respond.",
		)

		await act(async () => result.current.actions.load())
		expect(result.current.state.loadError).toBeUndefined()
		expect(result.current.state.localPort).toBe('12080')
	})

	it('locks duplicate saves and reports a failed write', async () => {
		let rejectWrite: ((reason?: unknown) => void) | undefined
		const write = vi.fn(
			() =>
				new Promise<void>((_resolve, reject) => {
					rejectWrite = reject
				}),
		)
		const runtime = createRuntime({
			settingsStore: { read: vi.fn().mockResolvedValue({}), write },
		})
		const { result } = renderHook(() => useSettings(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})
		await waitFor(() => expect(result.current.state.isLoading).toBe(false))

		let firstSave: Promise<boolean> | undefined
		let secondSave: Promise<boolean> | undefined
		act(() => {
			firstSave = result.current.actions.save()
			secondSave = result.current.actions.save()
		})
		await waitFor(() => expect(result.current.state.pendingAction).toBe('save'))
		expect(write).toHaveBeenCalledOnce()

		rejectWrite?.(new Error('disk is read-only'))
		await act(async () => {
			await Promise.all([firstSave, secondSave])
		})
		expect(result.current.state.pendingAction).toBeNull()
		expect(result.current.state.failure).toBe(
			"Couldn't save settings. Try again.",
		)
	})

	it('rolls visible and native settings back when persistence fails', async () => {
		const enable = vi.fn().mockResolvedValue(undefined)
		const disable = vi.fn().mockResolvedValue(undefined)
		const read = vi.fn().mockResolvedValue({
			engineId: 'xray',
			launchAtStartup: false,
			localPort: 12080,
		})
		const runtime = createRuntime({
			settingsStore: {
				read,
				write: vi.fn().mockRejectedValue(new Error('disk is read-only')),
			},
			capabilities: {
				clipboard: {
					async read() {
						return ''
					},
					async write() {},
				},
				qrEncoder: {
					async encode(value) {
						return value
					},
				},
				autostart: {
					enable,
					disable,
					async status() {
						return { enabled: false, supported: true }
					},
				},
			},
		})
		const { result } = renderHook(() => useSettings(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})
		await waitFor(() => expect(result.current.state.isLoading).toBe(false))

		act(() => {
			result.current.actions.setEngineId('sing-box')
			result.current.actions.setLaunchAtStartup(true)
		})
		await act(async () => {
			expect(
				await result.current.actions.save({
					engineId: 'sing-box',
					launchAtStartup: true,
				}),
			).toBe(false)
		})

		expect(enable).toHaveBeenCalledOnce()
		expect(disable).toHaveBeenCalledOnce()
		expect(result.current.state.engineId).toBe('xray')
		expect(result.current.state.launchAtStartup).toBe(false)
		expect(result.current.state.localPort).toBe('12080')
	})

	it('does not re-enter initial loading when translations change', async () => {
		const read = vi.fn().mockResolvedValue({ language: 'en' })
		const runtime = createRuntime({
			settingsStore: { read, write: vi.fn() },
		})
		const { result } = renderHook(() => useSettings(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})
		await waitFor(() => expect(result.current.state.isLoading).toBe(false))

		await act(async () => {
			await changeAppLanguage('fa')
		})

		expect(read).toHaveBeenCalledOnce()
		expect(result.current.state.isLoading).toBe(false)
		await changeAppLanguage('en')
	})

	it('keeps a saved edit when an older background refresh finishes later', async () => {
		let resolveRefresh:
			| ((value: { readonly engineId: 'xray' }) => void)
			| undefined
		const read = vi
			.fn()
			.mockResolvedValueOnce({ engineId: 'xray' })
			.mockImplementationOnce(
				() =>
					new Promise<{ readonly engineId: 'xray' }>((resolve) => {
						resolveRefresh = resolve
					}),
			)
			.mockResolvedValue({ engineId: 'xray' })
		const runtime = createRuntime({
			settingsStore: { read, write: vi.fn().mockResolvedValue(undefined) },
		})
		const { result } = renderHook(() => useSettings(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})
		await waitFor(() => expect(result.current.state.isLoading).toBe(false))

		let refresh: Promise<boolean> | undefined
		act(() => {
			refresh = result.current.actions.load()
			result.current.actions.setEngineId('sing-box')
		})
		expect(result.current.state.isLoading).toBe(false)
		await act(async () => {
			expect(await result.current.actions.save({ engineId: 'sing-box' })).toBe(
				true,
			)
		})
		act(() => resolveRefresh?.({ engineId: 'xray' }))
		await act(async () => {
			await refresh
		})

		expect(result.current.state.engineId).toBe('sing-box')
	})

	it('keeps current values and reports a failed reset', async () => {
		const runtime = createRuntime({
			settingsStore: {
				read: vi.fn().mockResolvedValue({ localPort: 12080, engineId: 'xray' }),
				write: vi.fn().mockRejectedValue(new Error('permission denied')),
			},
		})
		const { result } = renderHook(() => useSettings(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})
		await waitFor(() => expect(result.current.state.localPort).toBe('12080'))

		await act(async () => {
			expect(await result.current.actions.reset()).toBe(false)
		})

		expect(result.current.state.localPort).toBe('12080')
		expect(result.current.state.engineId).toBe('xray')
		expect(result.current.state.failure).toBe(
			"Couldn't reset settings. Try again.",
		)
	})

	it('delegates scoped resets to the runtime and reloads the retained settings', async () => {
		const read = vi
			.fn()
			.mockResolvedValueOnce({ localPort: 12080, engineId: 'xray' })
			.mockResolvedValue({ connectionMode: 'vpn', theme: 'system' })
		const reset = vi.fn().mockResolvedValue({
			status: 'completed',
			scope: 'app-data',
			completed: ['read-current-data', 'native-cleanup'],
		})
		const runtime = createRuntime({
			settingsStore: { read, write: vi.fn() },
			reset: { reset },
		})
		const { result } = renderHook(() => useSettings(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})
		await waitFor(() => expect(result.current.state.localPort).toBe('12080'))

		await act(async () => {
			expect(await result.current.actions.reset('app-data')).toBe(true)
		})

		expect(reset).toHaveBeenCalledOnce()
		expect(reset).toHaveBeenCalledWith('app-data')
		expect(result.current.state.localPort).toBe('10808')
		expect(result.current.state.engineId).toBe('sing-box')
	})

	it('defaults to sing-box over VPN and reports unavailable tunnel capability honestly', async () => {
		const enable = vi.fn()
		const runtime = createRuntime({
			capabilities: {
				clipboard: {
					async read() {
						return ''
					},
					async write() {},
				},
				share: { async share() {} },
				qrEncoder: {
					async encode(value) {
						return value
					},
				},
				systemProxy: {
					enable,
					async disable() {},
					async status() {
						return {
							enabled: false,
							supported: false,
							detail: 'unsigned build',
						}
					},
				},
			},
		})

		const { result } = renderHook(() => useSettings(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})

		await waitFor(() => {
			expect(result.current.state.isLoading).toBe(false)
			expect(result.current.state.systemProxySupported).toBe(false)
			expect(result.current.state.vpnSupported).toBe(false)
			expect(result.current.state.engineId).toBe('sing-box')
			expect(result.current.state.connectionMode).toBe('vpn')
		})

		await act(async () => {
			await result.current.actions.save()
		})

		expect(enable).not.toHaveBeenCalled()
		await expect(runtime.settingsStore.read()).resolves.toMatchObject({
			engineId: 'sing-box',
			connectionMode: 'vpn',
		})
	})

	it('persists proxy fallback without activating it until connect', async () => {
		const enable = vi.fn().mockResolvedValue(undefined)
		const runtime = createRuntime({
			capabilities: {
				clipboard: {
					async read() {
						return ''
					},
					async write() {},
				},
				share: { async share() {} },
				qrEncoder: {
					async encode(value) {
						return value
					},
				},
				systemProxy: {
					enable,
					async disable() {},
					async status() {
						return { enabled: false, supported: true }
					},
				},
			},
		})

		const { result } = renderHook(() => useSettings(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})

		await waitFor(() => {
			expect(result.current.state.isLoading).toBe(false)
			expect(result.current.state.systemProxySupported).toBe(true)
		})

		act(() => {
			result.current.actions.setConnectionMode('proxy')
			result.current.actions.setLocalPort('12080')
		})
		await act(async () => {
			await result.current.actions.save({ connectionMode: 'proxy' })
		})

		expect(enable).not.toHaveBeenCalled()
		await expect(runtime.settingsStore.read()).resolves.toMatchObject({
			connectionMode: 'proxy',
			localPort: 12080,
		})
		expect(runtime.logs.records()).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					module: 'user-action',
					msg: 'Connection mode selected: proxy',
					bindings: expect.objectContaining({
						action: 'connection-mode.select',
						connectionMode: 'proxy',
					}),
				}),
				expect.objectContaining({
					msg: 'Settings saved with sing-box in proxy mode',
				}),
			]),
		)
	})
})
