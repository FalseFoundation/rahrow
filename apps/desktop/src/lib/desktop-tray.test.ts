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
import type { AppRuntime } from '@rahrow/features/app/runtime.tsx'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const invoke = vi.hoisted(() => vi.fn())

vi.mock('@tauri-apps/api/core', () => ({ invoke }))
vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn(async () => () => {}),
}))

import { handleDesktopTrayAction, syncDesktopTray } from './desktop-tray.ts'

const profile: ConnectionProfile = {
	id: 'tray-profile',
	protocol: 'vless',
	endpoint: { host: 'example.com', port: 443 },
	authentication: { id: '11111111-1111-4111-8111-111111111111' },
	metadata: { name: 'Germany' },
}

const idleEngine: ProxyEngine = {
	id: 'sing-box',
	manifest: {
		id: 'sing-box',
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

function createRuntime(connection: AppRuntime['connection']): AppRuntime {
	return {
		profileStore: new JsonProfileStore(new MemoryDocumentStore()),
		settingsStore: new JsonSettingsStore(new MemoryDocumentStore()),
		subscriptionStore: new JsonSubscriptionStore(new MemoryDocumentStore()),
		registry: defaultProtocolRegistry,
		engine: idleEngine,
		connection,
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

describe('desktop tray', () => {
	beforeEach(() => {
		invoke.mockReset()
		invoke.mockResolvedValue(undefined)
		Object.defineProperty(globalThis, '__TAURI_INTERNALS__', {
			value: {},
			configurable: true,
		})
	})

	it('syncs the selected profile label and connect affordance while disconnected', async () => {
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
		await runtime.profileStore.save(profile)
		await runtime.settingsStore.write({ activeProfileId: profile.id })

		await syncDesktopTray(runtime)

		expect(invoke).toHaveBeenCalledWith('rahrow_tray_sync', {
			input: {
				connected: false,
				profileLabel: 'Germany',
				canConnect: true,
				canDisconnect: false,
			},
		})
	})

	it('connects the active profile from the tray without opening the window', async () => {
		const connect = vi.fn().mockResolvedValue(undefined)
		const runtime = createRuntime({
			connect,
			async canConnect() {},
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
			activeProfileId: profile.id,
			engineId: 'sing-box',
			connectionMode: 'vpn',
			localPort: 20808,
		})

		await handleDesktopTrayAction(runtime, 'connect')

		expect(connect).toHaveBeenCalledWith(profile, {
			localPort: 20808,
			mode: 'vpn',
			engineId: 'sing-box',
		})
		expect(invoke).toHaveBeenCalledWith('rahrow_tray_sync', expect.any(Object))
	})

	it('disconnects from the tray', async () => {
		const disconnect = vi.fn().mockResolvedValue(undefined)
		const runtime = createRuntime({
			async connect() {},
			disconnect,
			async status() {
				return { state: 'connected', mode: 'vpn', profileId: profile.id }
			},
			async test() {
				return { reachable: false }
			},
		})
		await runtime.profileStore.save(profile)

		await handleDesktopTrayAction(runtime, 'disconnect')

		expect(disconnect).toHaveBeenCalledOnce()
		expect(invoke).toHaveBeenCalledWith('rahrow_tray_sync', expect.any(Object))
	})
})
