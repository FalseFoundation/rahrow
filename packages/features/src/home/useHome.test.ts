import { AdGateController } from '@rahrow/ads/ad-gate.ts'
import { createLogBuffer } from '@rahrow/core/logging/log-buffer.ts'
import { silentLogger } from '@rahrow/core/logging/silent-logger.ts'
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
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import {
	type AppRuntime,
	AppRuntimeProvider,
	type ConnectionPort,
} from '../app/runtime.tsx'
import { useHome } from './useHome.ts'

const profile: ConnectionProfile = {
	id: 'home-profile',
	protocol: 'vless',
	endpoint: {
		host: 'example.com',
		port: 443,
	},
	authentication: {
		id: '11111111-1111-4111-8111-111111111111',
	},
}

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
			profileId: profile.id,
			reachable: false,
			checkedAt: '2026-01-01T00:00:00.000Z',
		}
	},
}

function createRuntime(
	connection: ConnectionPort,
	egressIdentity?: AppRuntime['egressIdentity'],
): AppRuntime {
	return {
		profileStore: new JsonProfileStore(new MemoryDocumentStore()),
		settingsStore: new JsonSettingsStore(new MemoryDocumentStore()),
		subscriptionStore: new JsonSubscriptionStore(new MemoryDocumentStore()),
		registry: defaultProtocolRegistry,
		engine: idleEngine,
		connection,
		...(egressIdentity ? { egressIdentity } : {}),
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
			vpn: {
				async connect() {},
				async disconnect() {},
				async status() {
					return { supported: true, connected: false }
				},
			},
			systemProxy: {
				async enable() {},
				async disable() {},
				async status() {
					return { supported: true, enabled: false }
				},
			},
		},
		diagnostics: {
			async snapshot() {
				return { capabilities: [] }
			},
		},
		subscriptionFetcher: httpSubscriptionFetcher,
		logger: silentLogger,
		logs: createLogBuffer(),
	}
}

describe('useHome', () => {
	it('queues an ad after three user-driven profile switches', async () => {
		const gate = new AdGateController({ storage: new MemoryDocumentStore() })
		const baseRuntime = createRuntime({
			async connect() {},
			async disconnect() {},
			async status() {
				return { state: 'disconnected', mode: 'vpn' }
			},
			async test() {
				return { reachable: false }
			},
		})
		const profiles = ['one', 'two', 'three', 'four'].map(
			(id): ConnectionProfile => ({ ...profile, id }),
		)
		for (const candidate of profiles)
			await baseRuntime.profileStore.save(candidate)
		const runtime: AppRuntime = {
			...baseRuntime,
			advertising: {
				gate,
				provider: { id: 'test', load: async () => null },
			},
		}
		const { result } = renderHook(() => useHome(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})

		await waitFor(() => expect(result.current.state.profiles).toHaveLength(4))
		for (const candidate of profiles.slice(1)) {
			act(() => result.current.actions.selectProfile(candidate))
			await waitFor(() =>
				expect(result.current.state.selectedProfileId).toBe(candidate.id),
			)
		}

		await waitFor(() => expect(gate.snapshot().obligations).toHaveLength(1))
		expect(gate.snapshot().obligations[0]?.trigger).toBe('profile-selection')
	})

	it('records each completed selected-profile ping once', async () => {
		const gate = new AdGateController({ storage: new MemoryDocumentStore() })
		const baseRuntime = createRuntime({
			async connect() {},
			async disconnect() {},
			async status() {
				return { state: 'disconnected', mode: 'vpn' }
			},
			async test() {
				return { reachable: false }
			},
		})
		await baseRuntime.profileStore.save(profile)
		const runtime: AppRuntime = {
			...baseRuntime,
			advertising: {
				gate,
				provider: { id: 'test', load: async () => null },
			},
		}
		const { result } = renderHook(() => useHome(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})
		await waitFor(() => expect(result.current.state.selectedProfile).toBeTruthy())

		for (let index = 0; index < 10; index += 1) {
			await act(async () => result.current.actions.testSelected())
		}

		await waitFor(() => expect(gate.snapshot().obligations).toHaveLength(1))
		expect(gate.snapshot().obligations[0]?.trigger).toBe('ping-actions')
	})

	it('keeps initial read failures distinct from an empty library and recovers on retry', async () => {
		const runtime = createRuntime({
			async connect() {},
			async disconnect() {},
			async status() {
				return { state: 'disconnected', mode: 'vpn' }
			},
			async test() {
				return { reachable: false }
			},
		})
		await runtime.profileStore.save(profile)
		vi
			.spyOn(runtime.profileStore, 'list')
			.mockRejectedValueOnce(new Error('sqlite: database file is locked'))

		const { result } = renderHook(() => useHome(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})

		await waitFor(() =>
			expect(result.current.state.initializationFailure).toBeTruthy(),
		)
		expect(result.current.state.isInitialized).toBe(false)
		expect(result.current.state.canConnect).toBe(false)
		expect(result.current.state.canDisconnect).toBe(false)
		expect(result.current.state.initializationFailure).toEqual({
			title: "Couldn't load Home",
			description:
				'RahRow could not read your connections and current connection status.',
			detail: 'Your connections were not changed. Try again or open Diagnostics.',
		})
		expect(
			JSON.stringify(result.current.state.initializationFailure),
		).not.toContain('sqlite')

		await act(async () => result.current.actions.refresh())

		expect(result.current.state.initializationFailure).toBeNull()
		expect(result.current.state.isInitialized).toBe(true)
		expect(result.current.state.profiles).toEqual([profile])
	})

	it('blocks connect and explains when the selected connection mode is unsupported', async () => {
		const connect = vi.fn().mockResolvedValue(undefined)
		const baseRuntime = createRuntime({
			connect,
			async disconnect() {},
			async status() {
				return { state: 'disconnected', mode: 'vpn' }
			},
			async test() {
				return { reachable: false }
			},
		})
		const runtime: AppRuntime = {
			...baseRuntime,
			capabilities: {
				...baseRuntime.capabilities,
				vpn: {
					async connect() {},
					async disconnect() {},
					async status() {
						return { supported: false, connected: false }
					},
				},
				systemProxy: {
					async enable() {},
					async disable() {},
					async status() {
						return { supported: true, enabled: false }
					},
				},
			},
		}
		await runtime.profileStore.save(profile)

		const { result } = renderHook(() => useHome(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})

		await waitFor(() => expect(result.current.state.isInitialized).toBe(true))
		expect(result.current.state.canConnect).toBe(false)
		expect(result.current.state.connectUnavailableReason).toBe(
			'VPN mode is unavailable. Switch to System proxy in Settings.',
		)

		await act(async () => result.current.actions.connect())
		expect(connect).not.toHaveBeenCalled()
	})

	it('turns a native connect failure into safe recovery state', async () => {
		const runtime = createRuntime({
			connect: vi
				.fn()
				.mockRejectedValue(
					new Error('command rahrow_vpn_start exited with status 127'),
				),
			async disconnect() {},
			async status() {
				return { state: 'disconnected' }
			},
			async test() {
				return { reachable: false }
			},
		})
		await runtime.profileStore.save(profile)
		const { result } = renderHook(() => useHome(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})

		await waitFor(() => expect(result.current.state.profiles).toHaveLength(1))
		await act(async () => result.current.actions.connect())

		expect(result.current.state.failure).toEqual({
			operation: 'connect',
			title: "Couldn't connect",
			description:
				'RahRow could not start the secure tunnel. Check Diagnostics, then try again.',
			retryLabel: 'Try again',
		})
		expect(JSON.stringify(result.current.state.failure)).not.toContain(
			'rahrow_vpn_start',
		)
	})

	it('turns a native disconnect failure into safe recovery state', async () => {
		const runtime = createRuntime({
			async connect() {},
			disconnect: vi
				.fn()
				.mockRejectedValue(new Error('failed to invoke native teardown command')),
			async status() {
				return { state: 'connected', mode: 'vpn' }
			},
			async test() {
				return { reachable: false }
			},
		})
		const { result } = renderHook(() => useHome(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})

		await waitFor(() => expect(result.current.state.isInitialized).toBe(true))
		await act(async () => result.current.actions.disconnect())

		expect(result.current.state.failure).toEqual({
			operation: 'disconnect',
			title: "Couldn't disconnect",
			description:
				'RahRow could not stop the connection cleanly. Check Diagnostics before trying again.',
			retryLabel: 'Try again',
		})
		expect(JSON.stringify(result.current.state.failure)).not.toContain(
			'native teardown',
		)
	})

	it('connects the selected profile through the runtime connection port and durable settings store', async () => {
		const connect = vi.fn().mockResolvedValue(undefined)
		const runtime = createRuntime({
			connect,
			async disconnect() {},
			async status() {
				return { state: 'disconnected' }
			},
			async test() {
				return { reachable: false }
			},
		})

		await runtime.profileStore.save(profile)
		await runtime.settingsStore.write({ localPort: 12080 })

		const { result } = renderHook(() => useHome(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})

		await waitFor(() => {
			expect(result.current.state.profiles).toHaveLength(1)
		})

		await result.current.actions.connect()

		expect(connect).toHaveBeenCalledWith(profile, {
			localPort: 12080,
			mode: 'vpn',
		})
		await expect(runtime.settingsStore.read()).resolves.toMatchObject({
			activeProfileId: 'home-profile',
			localPort: 12080,
			engineId: 'sing-box',
			connectionMode: 'vpn',
		})
	})

	it('passes an explicit proxy fallback selection to the connection port', async () => {
		const connect = vi.fn().mockResolvedValue(undefined)
		const runtime = createRuntime({
			connect,
			async disconnect() {},
			async status() {
				return { state: 'disconnected' }
			},
			async test() {
				return { reachable: false }
			},
		})

		await runtime.profileStore.save(profile)
		await runtime.settingsStore.write({ connectionMode: 'proxy' })
		const { result } = renderHook(() => useHome(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})

		await waitFor(() => expect(result.current.state.profiles).toHaveLength(1))
		await result.current.actions.connect()

		expect(connect).toHaveBeenCalledWith(profile, {
			localPort: 10808,
			mode: 'proxy',
		})
	})

	it('observes the external address only through the injected post-connect port', async () => {
		const runtime = createRuntime(
			{
				async connect() {},
				async disconnect() {},
				async status() {
					return { state: 'connected', mode: 'vpn' }
				},
				async test() {
					return { reachable: false }
				},
			},
			{
				async observe() {
					return {
						ip: '203.0.113.20',
						countryCode: 'NL',
						provider: 'cloudflare',
					}
				},
			},
		)

		const { result } = renderHook(() => useHome(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})

		await waitFor(() => {
			expect(result.current.state.egressIdentity).toEqual({
				status: 'available',
				observation: {
					ip: '203.0.113.20',
					countryCode: 'NL',
					provider: 'cloudflare',
				},
			})
		})
	})

	it('coalesces Smart Connect completion bursts into one authoritative refresh', async () => {
		const nextProfile: ConnectionProfile = {
			...profile,
			id: 'smart-winner',
			metadata: { name: 'Smart winner' },
		}
		let snapshot = {
			state: 'disconnected',
			mode: 'vpn' as const,
			profileId: profile.id,
		}
		const status = vi.fn(async () => snapshot)
		const runtime = createRuntime({
			async connect() {},
			async disconnect() {},
			status,
			async test() {
				return { reachable: true, latencyMs: 12 }
			},
		})
		await runtime.profileStore.save(profile)
		await runtime.profileStore.save(nextProfile)
		await runtime.settingsStore.write({ activeProfileId: profile.id })
		let publishSmartCompletion: (() => void) | undefined
		const unsubscribe = vi.fn()
		const smartConnect = {
			orchestrator: {
				async status() {
					return { enabled: true }
				},
				async start() {
					return { enabled: true }
				},
				async stop() {
					return { enabled: false }
				},
				async run() {
					return { outcome: 'unchanged', probed: 0 }
				},
			},
			schedule: {
				async resume() {},
			},
			subscribe(listener: () => void) {
				publishSmartCompletion = listener
				return unsubscribe
			},
		} as unknown as NonNullable<AppRuntime['smartConnect']>
		const appRuntime: AppRuntime = { ...runtime, smartConnect }
		const { result, unmount } = renderHook(() => useHome(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, {
					runtime: appRuntime,
					children,
				}),
		})

		await waitFor(() =>
			expect(result.current.state.selectedProfileId).toBe(profile.id),
		)
		snapshot = {
			state: 'connected',
			mode: 'vpn',
			profileId: nextProfile.id,
		}
		await runtime.settingsStore.write({ activeProfileId: nextProfile.id })
		act(() => {
			publishSmartCompletion?.()
			publishSmartCompletion?.()
		})

		await waitFor(() => {
			expect(result.current.state.selectedProfileId).toBe(nextProfile.id)
			expect(result.current.state.connectionState).toBe('connected')
		})
		expect(status).toHaveBeenCalledTimes(2)
		expect(result.current.state.pendingAction).toBeNull()

		unmount()
		expect(unsubscribe).toHaveBeenCalledOnce()
	})

	it('refreshes authoritative state when the app becomes visible again', async () => {
		let state = 'disconnected'
		const status = vi.fn(async () => ({ state, mode: 'vpn' as const }))
		const runtime = createRuntime({
			async connect() {},
			async disconnect() {},
			status,
			async test() {
				return { reachable: false }
			},
		})
		const { result } = renderHook(() => useHome(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})
		await waitFor(() => expect(result.current.state.isInitialized).toBe(true))

		state = 'connected'
		act(() => document.dispatchEvent(new Event('visibilitychange')))

		await waitFor(() =>
			expect(result.current.state.connectionState).toBe('connected'),
		)
		expect(status).toHaveBeenCalledTimes(2)
		expect(result.current.state.pendingAction).toBeNull()
	})

	it('keeps the current Home surface when a background refresh fails', async () => {
		const status = vi
			.fn<ConnectionPort['status']>()
			.mockResolvedValueOnce({ state: 'connected', mode: 'vpn' })
			.mockRejectedValueOnce(new Error('temporary native status failure'))
		const runtime = createRuntime({
			async connect() {},
			async disconnect() {},
			status,
			async test() {
				return { reachable: false }
			},
		})
		const { result } = renderHook(() => useHome(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})
		await waitFor(() => expect(result.current.state.isInitialized).toBe(true))

		act(() => document.dispatchEvent(new Event('visibilitychange')))
		await waitFor(() => expect(status).toHaveBeenCalledTimes(2))

		expect(result.current.state.isInitialized).toBe(true)
		expect(result.current.state.initializationFailure).toBeNull()
		expect(result.current.state.connectionState).toBe('connected')
	})
})
