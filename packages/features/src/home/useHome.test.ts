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
import { createElement, type ReactNode, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'

import { PrimaryTabVisibilityProvider } from '../app/primary-tab-visibility.tsx'
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
		availableEngines: [
			{
				id: 'sing-box',
				supportedProtocols: ['vless', 'vmess', 'trojan', 'hysteria2'],
			},
			{
				id: 'xray',
				supportedProtocols: ['vless', 'vmess', 'trojan'],
			},
		],
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
			kind: 'unknown',
			title: "Couldn't connect",
			description:
				'RahRow could not start the secure tunnel. Check Diagnostics, then try again.',
			retryLabel: 'Try again',
			recovery: { kind: 'retry' },
			recoveryLabel: 'Try again',
		})
		expect(JSON.stringify(result.current.state.failure)).not.toContain(
			'rahrow_vpn_start',
		)
	})

	it('explains a local port conflict without leaking native command detail', async () => {
		const runtime = createRuntime({
			connect: vi
				.fn()
				.mockRejectedValue(
					new Error(
						"Local port 10808 is already in use. Stop the other local proxy, or change RahRow's local port in Settings.",
					),
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
			kind: 'portInUse',
			title: "Couldn't connect",
			description:
				"Another app is using RahRow's local port. Close that app (for example v2rayN), or choose a different port.",
			retryLabel: 'Try again',
			recovery: { kind: 'settings', drawer: 'proxy' },
			recoveryLabel: 'Change port',
		})
		expect(JSON.stringify(result.current.state.failure)).not.toContain('10808')
	})

	it('offers a free local port and reconnects with it in one tap', async () => {
		const connect = vi
			.fn()
			.mockRejectedValueOnce(
				new Error(
					'Local port 10808 is already in use. Stop the other local proxy.',
				),
			)
			.mockResolvedValueOnce(undefined)
		const suggestLocalPort = vi.fn().mockResolvedValue(20808)
		const runtime = createRuntime({
			connect,
			suggestLocalPort,
			async disconnect() {},
			async status() {
				return { state: 'disconnected', localPort: 20808 }
			},
			async test() {
				return { reachable: false }
			},
		})
		await runtime.profileStore.save(profile)
		await runtime.settingsStore.write({
			...(await runtime.settingsStore.read()),
			localPort: 10808,
			connectionMode: 'proxy',
		})
		const { result } = renderHook(() => useHome(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})

		await waitFor(() => {
			expect(result.current.state.localPort).toBe(10808)
			expect(result.current.state.canConnect).toBe(true)
		})
		await act(async () => result.current.actions.connect())

		expect(suggestLocalPort).toHaveBeenCalledWith(10808)
		expect(result.current.state.failure).toMatchObject({
			kind: 'portInUse',
			recovery: { kind: 'useFreePort', port: 20808 },
			recoveryLabel: 'Use 20808 and connect',
		})
		expect(result.current.state.failure?.description).toContain('20808')

		await act(async () => result.current.actions.useFreePortAndConnect())

		expect(connect).toHaveBeenLastCalledWith(
			profile,
			expect.objectContaining({ localPort: 20808 }),
		)
		await waitFor(() => expect(result.current.state.failure).toBeNull())
		expect((await runtime.settingsStore.read()).localPort).toBe(20808)
	})

	it('runs the connect preflight first and does not start an engine when it fails', async () => {
		const connect = vi.fn()
		const canConnect = vi.fn().mockRejectedValue(
			Object.assign(new Error('sing-box sidecar was not found.'), {
				code: 'engine_not_found',
			}),
		)
		const runtime = createRuntime({
			connect,
			canConnect,
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

		expect(canConnect).toHaveBeenCalledWith(
			profile,
			expect.objectContaining({ engineId: 'sing-box' }),
		)
		expect(connect).not.toHaveBeenCalled()
		expect(result.current.state.failure).toMatchObject({
			kind: 'engineMissing',
			recovery: { kind: 'switchEngine', engineId: 'xray' },
			recoveryLabel: 'Use Xray',
		})
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
			kind: 'unknown',
			title: "Couldn't disconnect",
			description:
				'RahRow could not stop the connection cleanly. Check Diagnostics before trying again.',
			retryLabel: 'Try again',
			recovery: { kind: 'retry' },
			recoveryLabel: 'Try again',
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
			engineId: 'sing-box',
		})
		await expect(runtime.settingsStore.read()).resolves.toMatchObject({
			activeProfileId: 'home-profile',
			localPort: 12080,
			engineId: 'sing-box',
			connectionMode: 'vpn',
		})
	})

	it('connects with the persisted engine selection instead of a stale runtime engine id', async () => {
		const connect = vi.fn().mockResolvedValue(undefined)
		const runtime = createRuntime({
			connect,
			async disconnect() {},
			async status() {
				return {
					state: 'disconnected',
					engineId: 'sing-box',
				}
			},
			async test() {
				return { reachable: false }
			},
		})

		await runtime.profileStore.save(profile)
		await runtime.settingsStore.write({
			localPort: 12080,
			engineId: 'xray',
		})

		const { result } = renderHook(() => useHome(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})

		await waitFor(() => {
			expect(result.current.state.engineId).toBe('xray')
		})

		await result.current.actions.connect()

		expect(connect).toHaveBeenCalledWith(profile, {
			localPort: 12080,
			mode: 'vpn',
			engineId: 'xray',
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
			engineId: 'sing-box',
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

	it('uses the persisted Connections selection when status still reports a stale disconnected profile', async () => {
		const germany: ConnectionProfile = {
			...profile,
			id: 'germany',
			metadata: { name: 'Germany' },
		}
		const netherlands: ConnectionProfile = {
			...profile,
			id: 'netherlands',
			metadata: { name: 'Cloud Netherlands' },
		}
		const runtime = createRuntime({
			async connect() {},
			async disconnect() {},
			async status() {
				return {
					state: 'disconnected',
					mode: 'vpn',
					profileId: germany.id,
				}
			},
			async test() {
				return { reachable: false }
			},
		})
		await runtime.profileStore.save(germany)
		await runtime.profileStore.save(netherlands)
		await runtime.settingsStore.write({ activeProfileId: netherlands.id })

		const { result } = renderHook(() => useHome(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})

		await waitFor(() =>
			expect(result.current.state.selectedProfileId).toBe(netherlands.id),
		)
		expect(result.current.state.selectedProfile?.metadata?.name).toBe(
			'Cloud Netherlands',
		)
	})

	it('keeps a library profile selected when a live tunnel reports an unknown profile id', async () => {
		const runtime = createRuntime({
			async connect() {},
			async disconnect() {},
			async status() {
				return {
					state: 'connected',
					mode: 'vpn',
					engineStatus: 'running',
					profileId: 'orphan-native-id',
				}
			},
			async test() {
				return { reachable: false }
			},
		})
		await runtime.profileStore.save(profile)
		await runtime.settingsStore.write({ activeProfileId: profile.id })

		const { result } = renderHook(() => useHome(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})

		await waitFor(() =>
			expect(result.current.state.connectionState).toBe('connected'),
		)
		expect(result.current.state.selectedProfileId).toBe(profile.id)
		expect(result.current.state.selectedProfile?.id).toBe(profile.id)
	})

	it('picks up Connections selection when the Home tab becomes visible again', async () => {
		const nextProfile: ConnectionProfile = {
			...profile,
			id: 'library-picked',
			metadata: { name: 'Library picked' },
		}
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
		await runtime.profileStore.save(nextProfile)
		await runtime.settingsStore.write({ activeProfileId: profile.id })

		let tabVisible = true
		let rerenderTab: (() => void) | undefined
		function Wrapper({ children }: { children: ReactNode }) {
			const [, bump] = useState(0)
			rerenderTab = () => bump((value) => value + 1)
			return createElement(AppRuntimeProvider, {
				runtime,
				children: createElement(PrimaryTabVisibilityProvider, {
					active: tabVisible,
					children,
				}),
			})
		}

		const { result } = renderHook(() => useHome(), {
			wrapper: Wrapper,
		})

		await waitFor(() =>
			expect(result.current.state.selectedProfileId).toBe(profile.id),
		)

		tabVisible = false
		act(() => rerenderTab?.())
		await runtime.settingsStore.write({ activeProfileId: nextProfile.id })
		tabVisible = true
		act(() => rerenderTab?.())

		await waitFor(() =>
			expect(result.current.state.selectedProfileId).toBe(nextProfile.id),
		)
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

	it('persists the Home engine selection into the settings store', async () => {
		const runtime = createRuntime({
			async connect() {},
			async disconnect() {},
			async status() {
				return { state: 'disconnected' }
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
		expect(result.current.state.engineIds).toEqual(['sing-box', 'xray'])

		await act(async () => result.current.actions.selectEngine('xray'))

		expect(result.current.state.engineId).toBe('xray')
		await expect(runtime.settingsStore.read()).resolves.toMatchObject({
			engineId: 'xray',
		})
	})

	it('remembers the last good connection and reconnects it after a later failure', async () => {
		const connect = vi.fn().mockResolvedValue(undefined)
		const runtime = createRuntime({
			connect,
			async disconnect() {},
			async status() {
				return { state: 'disconnected', localPort: 12080 }
			},
			async test() {
				return { reachable: false }
			},
		})
		const otherProfile: ConnectionProfile = {
			...profile,
			id: 'other-profile',
			endpoint: { host: 'other.example.com', port: 443 },
		}
		await runtime.profileStore.save(profile)
		await runtime.profileStore.save(otherProfile)
		await runtime.settingsStore.write({
			localPort: 12080,
			engineId: 'sing-box',
			activeProfileId: otherProfile.id,
		})

		const { result } = renderHook(() => useHome(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})
		await waitFor(() => expect(result.current.state.profiles).toHaveLength(2))
		await act(async () => result.current.actions.selectProfile(profile))
		await act(async () => result.current.actions.connect())

		await expect(runtime.settingsStore.read()).resolves.toMatchObject({
			lastGoodConnection: {
				profileId: profile.id,
				engineId: 'sing-box',
				connectionMode: 'vpn',
				localPort: 12080,
			},
		})
		expect(result.current.state.lastGoodConnection?.profileId).toBe(profile.id)

		await act(async () => result.current.actions.selectProfile(otherProfile))
		await act(async () => result.current.actions.selectEngine('xray'))
		expect(result.current.state.canReconnectLastGood).toBe(true)

		connect.mockClear()
		await act(async () => result.current.actions.reconnectLastGood())

		expect(connect).toHaveBeenCalledWith(profile, {
			localPort: 12080,
			mode: 'vpn',
			engineId: 'sing-box',
		})
		expect(result.current.state.selectedProfileId).toBe(profile.id)
		expect(result.current.state.engineId).toBe('sing-box')
	})

	it('offers reconnect last good after an unknown connect failure', async () => {
		const connect = vi
			.fn()
			.mockRejectedValueOnce(new Error('tunnel handshake timed out'))
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
		await runtime.settingsStore.write({
			engineId: 'xray',
			activeProfileId: profile.id,
			lastGoodConnection: {
				profileId: profile.id,
				engineId: 'sing-box',
				connectionMode: 'vpn',
				localPort: 10808,
				connectedAt: '2026-01-01T00:00:00.000Z',
			},
		})

		const { result } = renderHook(() => useHome(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})
		await waitFor(() => expect(result.current.state.profiles).toHaveLength(1))
		await act(async () => result.current.actions.connect())

		expect(result.current.state.failure).toMatchObject({
			kind: 'unknown',
			recovery: { kind: 'reconnectLastGood' },
			recoveryLabel: 'Reconnect last good',
		})
	})
})
