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
import { act, renderHook } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'

import { type AppRuntime, AppRuntimeProvider } from '../app/runtime.tsx'
import { useLogs } from './useLogs.ts'

const profile: ConnectionProfile = {
	id: 'logs-profile',
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

function createRuntime() {
	const logs = createLogBuffer()
	const runtime: AppRuntime = {
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
		logger: silentLogger,
		logs,
	}

	return { runtime, logs }
}

describe('useLogs', () => {
	it('exposes live runtime records without table controls', () => {
		const { runtime, logs } = createRuntime()
		logs.write({
			time: 1,
			level: 'debug',
			msg: 'Starting engine',
			module: 'xray',
			bindings: {},
		})
		logs.write({
			time: 2,
			level: 'info',
			msg: 'Connected',
			module: 'connection',
			bindings: { profileId: profile.id },
		})
		logs.write({
			time: 3,
			level: 'error',
			msg: 'Xray start failed',
			module: 'xray',
			bindings: { err: 'boom' },
		})

		const { result } = renderHook(() => useLogs(), {
			wrapper: ({ children }: { children: ReactNode }) =>
				createElement(AppRuntimeProvider, { runtime, children }),
		})

		expect(result.current).toHaveLength(3)

		act(() => {
			logs.write({
				time: 4,
				level: 'info',
				msg: 'Profile imported',
				module: 'user-action',
				bindings: { action: 'profile.import' },
			})
		})

		expect(result.current.map((record) => record.msg)).toEqual([
			'Starting engine',
			'Connected',
			'Xray start failed',
			'Profile imported',
		])
	})
})
