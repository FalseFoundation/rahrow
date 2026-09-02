import { createLogBuffer } from '@rahrow/core/logging/log-buffer.ts'
import { silentLogger } from '@rahrow/core/logging/silent-logger.ts'
import { defaultProtocolRegistry } from '@rahrow/core/protocol/connection-protocol.ts'
import type { ProxyEngine } from '@rahrow/core/runtime/proxy-engine.ts'
import {
	JsonProfileStore,
	JsonSettingsStore,
	MemoryDocumentStore,
} from '@rahrow/core/storage/json-store.ts'
import { JsonSubscriptionStore } from '@rahrow/core/storage/subscription-store.ts'
import { httpSubscriptionFetcher } from '@rahrow/core/subscription/http-subscription-fetcher.ts'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))

vi.mock('@rahrow/ui/components/ui/sonner.tsx', () => ({ toast }))
vi.mock('../app/app-scroll-context.tsx', () => ({
	useAppScrollViewport: () => ({ current: null }),
}))

import { type AppRuntime, AppRuntimeProvider } from '../app/runtime.tsx'
import { Diagnostics } from './Diagnostics.tsx'

const engine: ProxyEngine = {
	id: 'sing-box',
	manifest: { id: 'sing-box', supportedProtocols: ['vless'] },
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

function createRuntime(
	options: {
		readonly lastError?: string
		readonly withLog?: boolean
		readonly clipboardSupported?: boolean
		readonly clipboardWrite?: (value: string) => Promise<void>
		readonly snapshot?: AppRuntime['diagnostics']['snapshot']
		readonly advertising?: AppRuntime['advertising']
	} = {},
): AppRuntime {
	const logs = createLogBuffer()
	if (options.withLog) {
		logs.write({
			time: Date.UTC(2026, 7, 30),
			level: 'info',
			msg: 'Diagnostics ready',
			module: 'app',
			bindings: {},
		})
	}
	return {
		...(options.advertising ? { advertising: options.advertising } : {}),
		profileStore: new JsonProfileStore(new MemoryDocumentStore()),
		settingsStore: new JsonSettingsStore(new MemoryDocumentStore()),
		subscriptionStore: new JsonSubscriptionStore(new MemoryDocumentStore()),
		registry: defaultProtocolRegistry,
		engine,
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
				supported: options.clipboardSupported ?? true,
				async read() {
					return ''
				},
				write: options.clipboardWrite ?? (async () => {}),
			},
			share: { async share() {} },
			qrEncoder: {
				async encode(value) {
					return value
				},
			},
		},
		diagnostics: {
			snapshot:
				options.snapshot ??
				(async () => {
					return {
						engineStatus: options.lastError ? 'stopped' : 'running',
						lastError: options.lastError,
						capabilities: [
							{
								name: 'xray-sidecar',
								supported: true,
								enabled: false,
								detail: 'Xray is available and stopped.',
							},
							{
								name: 'autostart',
								supported: true,
								enabled: false,
								detail: 'Starts after login.',
							},
							{
								name: 'sing-box-sidecar',
								supported: false,
								detail:
									'Bundle the pinned artifact from engines/sing-box/runtime.json.',
							},
						],
					}
				}),
		},
		subscriptionFetcher: httpSubscriptionFetcher,
		logger: silentLogger,
		logs,
	}
}

describe('Diagnostics', () => {
	afterEach(cleanup)
	beforeEach(() => {
		toast.error.mockReset()
		toast.success.mockReset()
	})

	it('distinguishes stopped, disabled, and unavailable capability states', async () => {
		const user = userEvent.setup()
		render(
			<AppRuntimeProvider runtime={createRuntime()}>
				<Diagnostics />
			</AppRuntimeProvider>,
		)

		expect(await screen.findByText('Xray is available and stopped.')).toBeTruthy()
		expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
		expect(
			screen.getByRole('heading', { level: 2, name: 'Runtime health' }),
		).toBeTruthy()
		expect(screen.getByRole('tab', { name: 'Availability' })).toBeTruthy()
		expect(screen.getByRole('tab', { name: 'Logs' })).toBeTruthy()
		expect(screen.getByText('stopped')).toBeTruthy()
		expect(screen.getAllByText('disabled')).toHaveLength(2)
		expect(screen.getByText('unavailable')).toBeTruthy()
		expect(screen.queryByText('Runtime support is limited')).toBeNull()
		expect(screen.getByText('Runtime is ready')).toBeTruthy()
		expect(
			screen.getByText('The engine is running. Review each capability below.'),
		).toBeTruthy()
		expect(
			screen.getByText(
				'Bundle the pinned artifact from engines/sing-box/runtime.json.',
			),
		).toBeTruthy()
		expect(
			screen.queryByRole('heading', { level: 2, name: 'Application logs' }),
		).toBeNull()
		await user.click(screen.getByRole('tab', { name: 'Logs' }))
		expect(
			screen.getByRole('heading', { level: 2, name: 'Application logs' }),
		).toBeTruthy()
		expect(screen.getByText('No logs yet')).toBeTruthy()
		expect(
			screen.getByText('Connection and engine events will appear here.'),
		).toBeTruthy()
		expect(screen.queryByLabelText('Minimum level')).toBeNull()
		expect(screen.queryByRole('button', { name: 'Clear' })).toBeNull()
	})

	it('shows live advertising provider, threshold, queue, and outcome diagnostics', async () => {
		const gate = new AdGateController({
			storage: new MemoryDocumentStore(),
			createId: () => 'diagnostic-ad',
			now: () => 123,
		})
		await gate.initialize()
		await gate.recordProfileSelection('one', 'two')
		await gate.recordProfileSelection('two', 'three')
		const provider: AdProvider = {
			id: 'house-development',
			async load() {
				return null
			},
		}
		render(
			<AppRuntimeProvider
				runtime={createRuntime({ advertising: { gate, provider } })}
			>
				<Diagnostics />
			</AppRuntimeProvider>,
		)

		const advertising = await screen.findByText('Advertising')
		const row = advertising.closest('[data-slot="item"]')
		expect(row?.textContent).toContain('house-development')
		expect(row?.textContent).toContain('2 of 3 connection selections recorded')
		expect(row?.textContent).toContain('No ads queued')

		await gate.recordProfileSelection('three', 'four')
		await waitFor(() => expect(row?.textContent).toContain('1 ad queued'))
		expect(row?.textContent).toContain('pending')
	})

	it('explains when no advertising provider is configured', async () => {
		render(
			<AppRuntimeProvider runtime={createRuntime()}>
				<Diagnostics />
			</AppRuntimeProvider>,
		)

		const advertising = await screen.findByText('Advertising')
		const row = advertising.closest('[data-slot="item"]')
		expect(row?.textContent).toContain(
			'No advertising provider is configured for this build.',
		)
	})

	it('uses the app scroll surface for the virtualized log display', async () => {
		const user = userEvent.setup()
		render(
			<AppRuntimeProvider runtime={createRuntime({ withLog: true })}>
				<Diagnostics />
			</AppRuntimeProvider>,
		)

		await user.click(screen.getByRole('tab', { name: 'Logs' }))
		const logs = await screen.findByRole('region', { name: 'Application logs' })
		expect(logs.querySelector('[data-slot="scroll-area"]')).toBeNull()
		expect(
			screen.getByRole('list', { name: 'Application log records' }),
		).toBeTruthy()
	})

	it('keeps a long engine error visible and explains how to recover', async () => {
		const error =
			'Unable to launch sing-box because the selected configuration references a missing certificate at /Users/example/Library/Application Support/RahRow/certificates/production-client-certificate.pem.'

		render(
			<AppRuntimeProvider runtime={createRuntime({ lastError: error })}>
				<Diagnostics />
			</AppRuntimeProvider>,
		)

		const summary = await screen.findByRole('alert')
		expect(summary.textContent).toContain('Runtime needs attention')
		expect(summary.textContent).not.toContain(error)
		expect(summary.textContent).toContain(
			'Resolve the engine error, then refresh runtime health.',
		)
		expect(screen.getAllByText(error, { exact: false }).length).toBeGreaterThan(0)
	})

	it('shows full multiline, unbroken, native, and fallback details as selectable text', async () => {
		const unbroken = 'x'.repeat(400)
		const snapshot = vi.fn().mockResolvedValue({
			engineStatus: 'error',
			lastError: `Native engine error\n${unbroken}`,
			capabilities: [
				{ name: 'vpn', supported: false, detail: 'First line\nSecond line' },
				{ name: 'tray', supported: true },
			],
		})
		render(
			<AppRuntimeProvider runtime={createRuntime({ snapshot })}>
				<Diagnostics />
			</AppRuntimeProvider>,
		)

		const completeEngineDetail = `Last error: Native engine error\n${unbroken}`
		const engineDetail = await screen.findByText(
			(_content, element) => element?.textContent === completeEngineDetail,
		)
		expect(engineDetail.closest('[data-selectable]')).toBeTruthy()
		expect(
			screen
				.getByText(
					(_content, element) => element?.textContent === 'First line\nSecond line',
				)
				.closest('[data-selectable]'),
		).toBeTruthy()
		expect(
			screen.getByText('No detail available').closest('[data-selectable]'),
		).toBeTruthy()
		const vpnDetail = screen.getByText(
			(_content, element) => element?.textContent === 'First line\nSecond line',
		)
		const vpnCopy = screen.getByRole('button', {
			name: 'Copy vpn diagnostic details',
		})
		expect(
			vpnCopy.compareDocumentPosition(vpnDetail) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy()
	})

	it('copies complete deterministic item details with unique keyboard-accessible actions', async () => {
		const user = userEvent.setup()
		const write = vi.fn().mockResolvedValue(undefined)
		render(
			<AppRuntimeProvider runtime={createRuntime({ clipboardWrite: write })}>
				<Diagnostics />
			</AppRuntimeProvider>,
		)

		const copyEngine = await screen.findByRole('button', {
			name: 'Copy Engine diagnostic details',
		})
		copyEngine.focus()
		await user.keyboard('{Enter}')
		expect(write).toHaveBeenLastCalledWith(
			'Name: Engine\nStatus: running\nDetail: No engine errors reported',
		)
		expect(document.activeElement).toBe(copyEngine)
		expect(toast.success).toHaveBeenCalledWith(
			'Copied Engine diagnostic details.',
		)

		await user.click(
			screen.getByRole('button', {
				name: 'Copy xray-sidecar diagnostic details',
			}),
		)
		expect(write).toHaveBeenLastCalledWith(
			'Name: xray-sidecar\nStatus: stopped\nSupported: yes\nEnabled: no\nDetail: Xray is available and stopped.',
		)
	})

	it('hides copy actions when clipboard writing is unsupported', async () => {
		render(
			<AppRuntimeProvider runtime={createRuntime({ clipboardSupported: false })}>
				<Diagnostics />
			</AppRuntimeProvider>,
		)

		await screen.findByText('Xray is available and stopped.')
		expect(
			screen.queryByRole('button', { name: /Copy .* diagnostic details/ }),
		).toBeNull()
	})

	it('keeps clipboard failure visible and actionable', async () => {
		const user = userEvent.setup()
		render(
			<AppRuntimeProvider
				runtime={createRuntime({
					clipboardWrite: vi.fn().mockRejectedValue(new Error('denied')),
				})}
			>
				<Diagnostics />
			</AppRuntimeProvider>,
		)

		await user.click(
			await screen.findByRole('button', {
				name: 'Copy Engine diagnostic details',
			}),
		)
		expect(toast.error).toHaveBeenCalledWith(
			'Could not copy Engine diagnostic details. Check clipboard permission, then try again.',
		)
	})

	it('omits incidental refresh copy across repeated successes', async () => {
		const user = userEvent.setup()
		const snapshot = vi.fn().mockResolvedValue({
			engineStatus: 'running',
			capabilities: [],
		})
		render(
			<AppRuntimeProvider runtime={createRuntime({ snapshot })}>
				<Diagnostics />
			</AppRuntimeProvider>,
		)

		await screen.findByText('Runtime is ready')
		await user.click(
			screen.getByRole('button', { name: 'Refresh runtime health' }),
		)
		await waitFor(() => expect(snapshot).toHaveBeenCalledTimes(2))
		expect(screen.queryByText('Diagnostics updated')).toBeNull()
		expect(screen.queryByText('Diagnostics not run')).toBeNull()
	})

	it('keeps refresh failure retryable and removes it after recovery', async () => {
		const user = userEvent.setup()
		const snapshot = vi
			.fn()
			.mockResolvedValueOnce({ engineStatus: 'running', capabilities: [] })
			.mockRejectedValueOnce(new Error('Engine probe timed out'))
			.mockResolvedValueOnce({ engineStatus: 'stopped', capabilities: [] })
		render(
			<AppRuntimeProvider runtime={createRuntime({ snapshot })}>
				<Diagnostics />
			</AppRuntimeProvider>,
		)

		await screen.findByText('Runtime is ready')
		await user.click(
			screen.getByRole('button', { name: 'Refresh runtime health' }),
		)
		expect((await screen.findByRole('alert')).textContent).toContain(
			'Check that the engine is available',
		)
		await user.click(
			screen.getByRole('button', { name: 'Refresh runtime health' }),
		)
		await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
		expect(screen.getByText('Runtime is standing by')).toBeTruthy()
	})
})

import { AdGateController } from '@rahrow/ads/ad-gate.ts'
import type { AdProvider } from '@rahrow/ads/ad-provider.ts'
