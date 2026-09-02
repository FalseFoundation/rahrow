import { createLogBuffer } from '@rahrow/core/logging/log-buffer.ts'
import { createPinoLogger } from '@rahrow/core/logging/pino-logger.ts'
import { defaultProtocolRegistry } from '@rahrow/core/protocol/connection-protocol.ts'
import type { ProxyEngine } from '@rahrow/core/runtime/proxy-engine.ts'
import {
	JsonProfileStore,
	JsonSettingsStore,
	MemoryDocumentStore,
} from '@rahrow/core/storage/json-store.ts'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	profileSpeedTestStore,
	resetProfileSpeedTestStore,
} from './profile-speed-test-store.ts'
import { useProfileManagement } from './useProfileManagement.ts'

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
	async test(profile) {
		return {
			profileId: profile.id,
			reachable: false,
			checkedAt: '2026-01-01T00:00:00.000Z',
		}
	},
}

describe('useProfileManagement public contract', () => {
	beforeEach(() => resetProfileSpeedTestStore())

	it('revalidates current subscription locks and skips protected descendants at deletion time', async () => {
		const lockedProfile = {
			id: 'locked-child',
			protocol: 'vless' as const,
			endpoint: { host: 'locked.example', port: 443 },
			metadata: { source: 'subscription' as const, subscriptionId: 'locked' },
		}
		const standaloneProfile = {
			id: 'standalone',
			protocol: 'vless' as const,
			endpoint: { host: 'standalone.example', port: 443 },
			metadata: { source: 'manual' as const },
		}
		const profileStore = new JsonProfileStore(new MemoryDocumentStore())
		await profileStore.replaceAll([lockedProfile, standaloneProfile])
		const dependencies = {
			profileStore,
			subscriptionStore: {
				list: vi.fn(async () => [
					{ id: 'locked', url: 'https://locked.example', locked: true },
				]),
			},
			registry: defaultProtocolRegistry,
			engine: idleEngine,
			capabilities: {
				clipboard: {
					read: vi.fn(async () => ''),
					write: vi.fn(async () => undefined),
				},
				qrEncoder: { encode: vi.fn(async (value: string) => value) },
			},
			logger: createPinoLogger({
				destination: createLogBuffer(),
				level: 'debug',
			}),
		}
		const result = renderHook(() => useProfileManagement(dependencies))
		await waitFor(() => expect(result.result.current.state.isLoading).toBe(false))

		let outcome: { removedCount: number; skippedLockedCount: number } | undefined
		await act(async () => {
			outcome = await result.result.current.actions.deleteProfiles([
				lockedProfile,
				standaloneProfile,
			])
		})

		expect(outcome).toEqual({ removedCount: 1, skippedLockedCount: 1 })
		expect((await profileStore.list()).map(({ id }) => id)).toEqual([
			'locked-child',
		])
	})

	it('restores persisted latency results after leaving Connections', async () => {
		const profile = {
			id: 'persisted-latency',
			protocol: 'vless' as const,
			endpoint: { host: 'latency.example', port: 443 },
		}
		const profileStore = new JsonProfileStore(new MemoryDocumentStore())
		await profileStore.save(profile)
		const settingsStore = new JsonSettingsStore(new MemoryDocumentStore())
		const engine: ProxyEngine = {
			...idleEngine,
			async test() {
				return {
					profileId: profile.id,
					reachable: true,
					latencyMs: 37,
					checkedAt: '2026-08-31T12:00:00.000Z',
				}
			},
		}
		const dependencies = {
			profileStore,
			settingsStore,
			registry: defaultProtocolRegistry,
			engine,
			capabilities: {
				clipboard: {
					read: vi.fn(async () => ''),
					write: vi.fn(async () => undefined),
				},
				qrEncoder: { encode: vi.fn(async (value: string) => value) },
			},
			logger: createPinoLogger({
				destination: createLogBuffer(),
				level: 'debug',
			}),
			adGate: {
				recordProfileSelection: vi.fn(async () => undefined),
				recordActionEvent: vi.fn(async () => ({
					status: 'recorded' as const,
					obligation: null,
				})),
			},
		}
		const first = renderHook(() => useProfileManagement(dependencies as never))
		await waitFor(() => expect(first.result.current.state.isLoading).toBe(false))

		await act(async () => first.result.current.actions.testSelected())
		expect(dependencies.adGate.recordActionEvent).toHaveBeenCalledWith({
			id: expect.any(String),
			action: 'profile-ping',
			outcome: 'completed',
		})
		await waitFor(async () =>
			expect(
				(await settingsStore.read()).latencyResults?.[profile.id],
			).toMatchObject({
				latencyMs: 37,
			}),
		)
		first.unmount()

		const restarted = renderHook(() =>
			useProfileManagement(dependencies as never),
		)
		await waitFor(() =>
			expect(restarted.result.current.state.isLoading).toBe(false),
		)
		expect(profileSpeedTestStore.state.results[profile.id]).toMatchObject({
			latencyMs: 37,
		})
	})

	it('records one subscription ping action after all child tests complete', async () => {
		const profileStore = new JsonProfileStore(new MemoryDocumentStore())
		const profiles = ['one', 'two', 'three'].map((id) => ({
			id,
			protocol: 'vless' as const,
			endpoint: { host: `${id}.example`, port: 443 },
		}))
		await profileStore.replaceAll(profiles)
		const recordActionEvent = vi.fn(async () => ({
			status: 'recorded' as const,
			obligation: null,
		}))
		const dependencies = {
			profileStore,
			registry: defaultProtocolRegistry,
			engine: idleEngine,
			capabilities: {
				clipboard: { read: vi.fn(async () => ''), write: vi.fn() },
				qrEncoder: { encode: vi.fn(async (value: string) => value) },
			},
			adGate: { recordActionEvent },
			logger: createPinoLogger({ destination: createLogBuffer(), level: 'debug' }),
		}
		const { result } = renderHook(() =>
			useProfileManagement(dependencies as never),
		)
		await waitFor(() => expect(result.current.state.isLoading).toBe(false))

		await act(async () =>
			result.current.actions.testProfiles(profiles, 'subscription-ping'),
		)

		expect(recordActionEvent).toHaveBeenCalledOnce()
		expect(recordActionEvent).toHaveBeenCalledWith({
			id: expect.any(String),
			action: 'subscription-ping',
			outcome: 'completed',
		})
	})

	it.each(['desktop', 'mobile'])(
		'restores persisted Connections view state after a %s restart',
		async () => {
			const profileStore = new JsonProfileStore(new MemoryDocumentStore())
			const settingsDocument = new MemoryDocumentStore()
			const settingsStore = new JsonSettingsStore(settingsDocument)
			const capabilities = {
				clipboard: {
					read: vi.fn(async () => ''),
					write: vi.fn(async () => undefined),
				},
				qrEncoder: { encode: vi.fn(async (value: string) => value) },
			}
			const logger = createPinoLogger({
				destination: createLogBuffer(),
				level: 'debug',
			})
			const dependencies = {
				profileStore,
				settingsStore,
				registry: defaultProtocolRegistry,
				engine: idleEngine,
				capabilities,
				logger,
			}
			const first = renderHook(() => useProfileManagement(dependencies))
			await waitFor(() => expect(first.result.current.state.isLoading).toBe(false))

			act(() => {
				first.result.current.actions.setConnectionGroupOpen('standalone', false)
				first.result.current.actions.setConnectionGroupOpen(
					'subscription:work',
					false,
				)
				first.result.current.actions.setConnectionsQuery('reality')
				first.result.current.actions.setConnectionsSort('speed-test')
			})
			await waitFor(async () =>
				expect((await settingsStore.read()).connectionsView).toMatchObject({
					groupOpen: { standalone: false, 'subscription:work': false },
					query: 'reality',
					sort: 'speed-test',
				}),
			)
			first.unmount()

			const restarted = renderHook(() => useProfileManagement(dependencies))
			await waitFor(() =>
				expect(restarted.result.current.state.isLoading).toBe(false),
			)
			expect(restarted.result.current.state.connectionsView).toMatchObject({
				groupOpen: { standalone: false, 'subscription:work': false },
				query: 'reality',
				sort: 'speed-test',
			})
			restarted.unmount()
		},
	)

	it('keeps Connections usable and reports a bounded preference read failure', async () => {
		const settingsStore = {
			read: vi.fn(async () => {
				throw new Error('private storage path')
			}),
			write: vi.fn(async () => undefined),
		}
		const dependencies = {
			profileStore: new JsonProfileStore(new MemoryDocumentStore()),
			settingsStore,
			registry: defaultProtocolRegistry,
			engine: idleEngine,
			capabilities: {
				clipboard: {
					read: vi.fn(async () => ''),
					write: vi.fn(async () => undefined),
				},
				qrEncoder: { encode: vi.fn(async (value: string) => value) },
			},
			logger: createPinoLogger({
				destination: createLogBuffer(),
				level: 'debug',
			}),
		}
		const { result } = renderHook(() => useProfileManagement(dependencies))

		await waitFor(() => expect(result.current.state.isLoading).toBe(false))
		expect(result.current.state.isInitialized).toBe(true)
		expect(result.current.state.initializationFailure).toBeNull()
		expect(result.current.state.connectionsView).toEqual({
			version: 1,
			groupOpen: {},
			query: '',
			sort: 'default',
		})
		expect(result.current.state.connectionsViewWarning).toContain(
			'could not be restored',
		)
		expect(result.current.state.connectionsViewWarning).not.toContain('private')
	})

	it('reports and repairs malformed persisted view state', async () => {
		const settingsDocument = new MemoryDocumentStore(
			JSON.stringify({
				version: 1,
				settings: {
					engineId: 'sing-box',
					connectionMode: 'vpn',
					connectionsView: { version: 0, groupOpen: [] },
				},
			}),
		)
		const settingsStore = new JsonSettingsStore(settingsDocument)
		const dependencies = {
			profileStore: new JsonProfileStore(new MemoryDocumentStore()),
			settingsStore,
			registry: defaultProtocolRegistry,
			engine: idleEngine,
			capabilities: {
				clipboard: {
					read: vi.fn(async () => ''),
					write: vi.fn(async () => undefined),
				},
				qrEncoder: { encode: vi.fn(async (value: string) => value) },
			},
			logger: createPinoLogger({
				destination: createLogBuffer(),
				level: 'debug',
			}),
		}
		const { result } = renderHook(() => useProfileManagement(dependencies))

		await waitFor(() =>
			expect(result.current.state.connectionsViewWarning).toContain('reset'),
		)
		await waitFor(async () =>
			expect((await settingsStore.read()).connectionsView).toEqual({
				version: 1,
				groupOpen: {},
				query: '',
				sort: 'default',
			}),
		)
	})

	it('keeps a failed initial read out of the empty state and locks mutations until retry', async () => {
		let failRead = true
		const list = vi.fn(async () => {
			if (failRead) throw new Error('sqlite: private database path')
			return []
		})
		const save = vi.fn(async () => undefined)
		const profileStore = {
			list,
			get: vi.fn(async () => null),
			save,
			remove: vi.fn(async () => undefined),
		}
		const capabilities = {
			clipboard: {
				read: vi.fn(async () => ''),
				write: vi.fn(async () => undefined),
			},
			qrEncoder: { encode: vi.fn(async (value: string) => value) },
		}
		const logger = createPinoLogger({
			destination: createLogBuffer(),
			level: 'debug',
		})
		const { result } = renderHook(() =>
			useProfileManagement({
				profileStore,
				registry: defaultProtocolRegistry,
				engine: idleEngine,
				capabilities,
				logger,
			}),
		)

		await waitFor(() =>
			expect(result.current.state.initializationFailure).toBeTruthy(),
		)
		expect(result.current.state.isInitialized).toBe(false)
		expect(
			JSON.stringify(result.current.state.initializationFailure),
		).not.toContain('private')

		await act(async () =>
			result.current.actions.saveProfile({
				id: 'blocked',
				protocol: 'trojan',
				endpoint: { host: 'example.com', port: 443 },
				authentication: { password: 'secret' },
			}),
		)
		expect(save).not.toHaveBeenCalled()

		failRead = false
		await act(async () => result.current.actions.reloadProfiles())
		expect(result.current.state.initializationFailure).toBeNull()
		expect(result.current.state.isInitialized).toBe(true)
	})

	it('leaves profile exporting to the canonical ShareDrawer', async () => {
		const logs = createLogBuffer()
		const profileStore = new JsonProfileStore(new MemoryDocumentStore())
		const capabilities = {
			clipboard: {
				async read() {
					return ''
				},
				async write() {},
			},
			qrEncoder: {
				async encode(value: string) {
					return value
				},
			},
		}
		const logger = createPinoLogger({ destination: logs, level: 'debug' })
		const { result } = renderHook(() =>
			useProfileManagement({
				profileStore,
				registry: defaultProtocolRegistry,
				engine: idleEngine,
				capabilities,
				logger,
			}),
		)

		await waitFor(() => expect(result.current.state.isLoading).toBe(false))

		expect(result.current.state).not.toHaveProperty('exportText')
		expect(result.current.state).not.toHaveProperty('exportTitle')
		expect(result.current.state).not.toHaveProperty('qrDataUrl')
		expect(result.current.actions).not.toHaveProperty('prepareExport')
		expect(result.current.actions).not.toHaveProperty('exportSelected')
		expect(result.current.actions).not.toHaveProperty('copyExport')
		expect(result.current.actions).not.toHaveProperty('shareExport')
		expect(result.current.actions).not.toHaveProperty('encodeQr')
	})

	it('rejects clipboard paste failures with bounded copy for the import drawer', async () => {
		const privateFailure = 'native bridge denied /Users/private/clipboard.db'
		const logs = createLogBuffer()
		const dependencies = {
			profileStore: new JsonProfileStore(new MemoryDocumentStore()),
			registry: defaultProtocolRegistry,
			engine: idleEngine,
			capabilities: {
				clipboard: {
					read: vi.fn(async () => {
						throw new Error(privateFailure)
					}),
					write: vi.fn(async () => undefined),
				},
				qrEncoder: { encode: vi.fn(async (value: string) => value) },
			},
			logger: createPinoLogger({ destination: logs, level: 'debug' }),
		}
		const { result } = renderHook(() => useProfileManagement(dependencies))

		await waitFor(() => expect(result.current.state.isLoading).toBe(false))
		await act(async () => {
			await expect(result.current.actions.pasteImportText()).rejects.toThrow(
				'Clipboard access is unavailable.',
			)
		})

		expect(result.current.state.message).toBe('Clipboard access is unavailable.')
		expect(result.current.state.message).not.toContain(privateFailure)
		expect(logs.records().at(-1)).toMatchObject({
			level: 'warn',
			msg: 'Clipboard read failed',
			bindings: expect.objectContaining({
				action: 'profile.import.paste',
				outcome: 'failure',
				errorType: 'Error',
			}),
		})
	})

	it('cancels the paced speed-test queue without starting pending profiles', async () => {
		let release: (() => void) | undefined
		const gate = new Promise<void>((resolve) => {
			release = resolve
		})
		const started: string[] = []
		let active = 0
		let peak = 0
		const engine: ProxyEngine = {
			...idleEngine,
			async test(profile) {
				started.push(profile.id)
				active += 1
				peak = Math.max(peak, active)
				await gate
				active -= 1
				return {
					profileId: profile.id,
					reachable: true,
					latencyMs: 20,
					checkedAt: '2026-01-01T00:00:00.000Z',
				}
			},
		}
		const dependencies = {
			profileStore: new JsonProfileStore(new MemoryDocumentStore()),
			registry: defaultProtocolRegistry,
			engine,
			capabilities: {
				clipboard: {
					read: vi.fn(async () => ''),
					write: vi.fn(async () => undefined),
				},
				qrEncoder: { encode: vi.fn(async (value: string) => value) },
			},
			logger: createPinoLogger({
				destination: createLogBuffer(),
				level: 'debug',
			}),
		}
		const { result } = renderHook(() => useProfileManagement(dependencies))
		const profiles = Array.from({ length: 10 }, (_, index) => ({
			id: `speed-${index}`,
			protocol: 'vmess' as const,
			endpoint: { host: `speed-${index}.example`, port: 443 },
		}))

		await waitFor(() => expect(result.current.state.isLoading).toBe(false))
		let work: Promise<'canceled' | 'completed' | 'skipped'> | undefined
		act(() => {
			work = result.current.actions.testProfiles(profiles)
		})
		await waitFor(() => expect(started).toHaveLength(4))
		expect(peak).toBe(4)
		expect(profileSpeedTestStore.state.progress).toMatchObject({
			pending: 10,
			total: 10,
			status: 'running',
		})

		act(() => result.current.actions.cancelSpeedTests())
		release?.()
		await act(async () => work)
		expect(started).toHaveLength(4)
		expect(profileSpeedTestStore.state.progress.status).toBe('canceled')
		expect(result.current.state.message).toBe('Latency test canceled')
	})
})
