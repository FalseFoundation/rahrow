import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const useSettings = vi.hoisted(() => vi.fn())
const navigate = vi.hoisted(() => vi.fn())
const applyTheme = vi.hoisted(() => vi.fn())
const search = vi.hoisted(() => ({ drawer: undefined as string | undefined }))
const toast = vi.hoisted(() => ({ dismiss: vi.fn(), error: vi.fn() }))
const externalOpen = vi.hoisted(() => vi.fn(async () => undefined))
const runtime = vi.hoisted(() => ({
	advertising: undefined,
	availableEngines: [
		{ id: 'sing-box', supportedProtocols: ['vless'] },
		{ id: 'xray', supportedProtocols: ['vless'] },
	],
	buildMetadata: undefined,
	capabilities: {
		externalNavigation: { open: externalOpen } as
			| { open(target: string): Promise<void> }
			| undefined,
	},
}))

vi.mock('@tanstack/react-router', () => ({
	useNavigate: () => navigate,
	useSearch: () => search,
}))
vi.mock('@rahrow/ui/components/theme-provider.tsx', () => ({
	useTheme: () => ({ setTheme: applyTheme }),
}))
vi.mock('@rahrow/ui/components/ui/sonner.tsx', () => ({ toast }))
vi.mock('../app/runtime.tsx', () => ({ useAppRuntime: () => runtime }))
vi.mock('../diagnostics/Diagnostics.tsx', () => ({
	Diagnostics: () => <section aria-label='Diagnostics drawer content' />,
}))
vi.mock('./useSettings.ts', () => ({ useSettings }))

import { changeAppLanguage } from '../app/app-i18n.tsx'
import { Settings } from './Settings.tsx'

const state = {
	localPort: '10808',
	engineId: 'sing-box',
	routingMode: 'global',
	theme: 'system',
	language: 'en',
	connectionMode: 'vpn',
	launchAtStartup: false,
	vpnSupported: false,
	systemProxySupported: false,
	autostartSupported: false,
	message: 'Ready',
	engineIds: ['sing-box', 'xray'],
	isLoading: false,
	loadError: undefined,
	failure: undefined,
	pendingAction: null,
	appVersion: '2.4.1',
} as const

function settingsResult(overrides: Record<string, unknown> = {}) {
	return {
		state: { ...state, ...overrides },
		actions: {
			load: vi.fn().mockResolvedValue(true),
			setLocalPort: vi.fn(),
			setEngineId: vi.fn(),
			setRoutingMode: vi.fn(),
			setTheme: vi.fn(),
			setLanguage: vi.fn(),
			setConnectionMode: vi.fn(),
			setLaunchAtStartup: vi.fn(),
			save: vi.fn().mockResolvedValue(true),
			reset: vi.fn().mockResolvedValue(true),
		},
	}
}

describe('Settings', () => {
	beforeEach(async () => {
		await changeAppLanguage('en')
		useSettings.mockReset()
		navigate.mockReset()
		applyTheme.mockReset()
		toast.dismiss.mockReset()
		toast.error.mockReset()
		externalOpen.mockReset()
		runtime.capabilities.externalNavigation = { open: externalOpen }
		search.drawer = undefined
	})
	afterEach(cleanup)

	it('shows initialization feedback without exposing editable defaults', () => {
		useSettings.mockReturnValue(settingsResult({ isLoading: true }))
		render(<Settings />)

		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
		expect(screen.getByRole('status').textContent).toContain('Loading settings')
		expect(screen.queryByRole('button', { name: /Engine/ })).toBeNull()
		expect(screen.queryByRole('button', { name: /Reset settings/ })).toBeNull()
	})

	it('shows a recoverable load failure', async () => {
		const result = settingsResult({
			loadError: "Couldn't load settings. settings document is unreadable",
			message: "Couldn't load settings. settings document is unreadable",
		})
		useSettings.mockReturnValue(result)
		const user = userEvent.setup()
		render(<Settings />)

		expect(screen.getByRole('alert').textContent).toContain(
			"Couldn't load settings. settings document is unreadable",
		)
		await user.click(screen.getByRole('button', { name: 'Try again' }))
		expect(result.actions.load).toHaveBeenCalledOnce()
	})

	it('locks settings while a write is pending', () => {
		useSettings.mockReturnValue(
			settingsResult({
				autostartSupported: true,
				pendingAction: 'save',
				message: 'Saving settings…',
			}),
		)
		render(<Settings />)

		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
		expect(
			screen.getByRole('heading', { level: 2, name: 'Connection' }),
		).toBeTruthy()
		expect(
			screen.queryByRole('heading', { level: 2, name: 'Connection library' }),
		).toBeNull()
		expect(screen.getByRole('heading', { level: 2, name: 'App' })).toBeTruthy()
		expect(
			screen.getByRole('button', { name: /Engine/ }).hasAttribute('disabled'),
		).toBe(true)
		expect(
			screen
				.getByRole('switch', { name: 'Launch at startup' })
				.hasAttribute('data-disabled'),
		).toBe(true)
		expect(
			screen
				.getByRole('button', { name: /Reset settings/ })
				.hasAttribute('disabled'),
		).toBe(true)
	})

	it('omits controls for capabilities the runtime does not provide', () => {
		useSettings.mockReturnValue(settingsResult())
		render(<Settings />)

		expect(screen.queryByText('Connection mode')).toBeNull()
		expect(screen.queryByText('Proxy settings')).toBeNull()
		expect(screen.queryByRole('switch', { name: 'Launch at startup' })).toBeNull()
		expect(screen.queryByText('Subscriptions')).toBeNull()
	})

	it('shows only the settings owned by the selected connection mode', () => {
		useSettings.mockReturnValue(
			settingsResult({
				connectionMode: 'vpn',
				vpnSupported: true,
				systemProxySupported: true,
			}),
		)
		const { rerender } = render(<Settings />)

		expect(screen.queryByText('Proxy settings')).toBeNull()
		expect(screen.getByText('Routing')).toBeTruthy()

		useSettings.mockReturnValue(
			settingsResult({
				connectionMode: 'proxy',
				vpnSupported: true,
				systemProxySupported: true,
			}),
		)
		rerender(<Settings />)

		expect(screen.getByText('Proxy settings')).toBeTruthy()
		expect(screen.queryByText('Routing')).toBeNull()
	})

	it('uses a mutually exclusive radio group for choices', async () => {
		useSettings.mockReturnValue(settingsResult())
		const user = userEvent.setup()
		render(<Settings />)

		await user.click(screen.getByRole('button', { name: /Appearance/ }))
		const group = screen.getByRole('radiogroup', { name: 'Appearance' })
		const radios = screen.getAllByRole('radio')
		expect(group).toBeTruthy()
		expect(radios).toHaveLength(3)
		expect(
			screen.getByRole('radio', { name: 'System' }).getAttribute('aria-checked'),
		).toBe('true')
		expect(
			screen.getByRole('radio', { name: 'Light' }).getAttribute('aria-checked'),
		).toBe('false')
	})

	it('persists a language selected in Settings', async () => {
		const result = settingsResult()
		useSettings.mockReturnValue(result)
		const user = userEvent.setup()
		render(<Settings />)

		await user.click(screen.getByRole('button', { name: /Language/ }))
		await user.click(screen.getByRole('radio', { name: 'فارسی' }))

		expect(result.actions.setLanguage).toHaveBeenCalledWith('fa')
		expect(result.actions.save).toHaveBeenCalledWith({ language: 'fa' })
	})

	it('opens diagnostics in a settings drawer instead of navigating away', async () => {
		useSettings.mockReturnValue(settingsResult())
		const user = userEvent.setup()
		render(<Settings />)

		await user.click(screen.getByRole('button', { name: /Diagnostics/ }))

		expect(screen.getByRole('dialog')).toBeTruthy()
		expect(
			screen.getByRole('heading', { level: 2, name: 'Diagnostics' }),
		).toBeTruthy()
		expect(screen.getByLabelText('Diagnostics drawer content')).toBeTruthy()
		expect(navigate).not.toHaveBeenCalled()
	})

	it('opens backup import and export from one Settings drawer', async () => {
		useSettings.mockReturnValue(settingsResult())
		const user = userEvent.setup()
		render(<Settings />)

		await user.click(screen.getByRole('button', { name: /Backup/ }))

		expect(screen.getByRole('dialog', { name: 'Backup' })).toBeTruthy()
		expect(screen.getByRole('button', { name: 'Export backup' })).toBeTruthy()
		expect(screen.getByRole('button', { name: 'Import backup' })).toBeTruthy()
	})

	it('opens and closes the diagnostics drawer from the settings search parameter', async () => {
		search.drawer = 'diagnostics'
		useSettings.mockReturnValue(settingsResult())
		const user = userEvent.setup()
		render(<Settings />)

		expect(screen.getByRole('dialog')).toBeTruthy()
		expect(screen.getByLabelText('Diagnostics drawer content')).toBeTruthy()

		await user.click(screen.getByRole('button', { name: 'Close drawer' }))
		expect(navigate).toHaveBeenCalledWith({
			to: '/settings',
			search: {},
			replace: true,
		})
	})

	it('uses injected version metadata and factual About copy', async () => {
		useSettings.mockReturnValue(settingsResult({ appVersion: '2.4.1' }))
		const user = userEvent.setup()
		render(<Settings />)

		expect(screen.getByText('2.4.1')).toBeTruthy()
		expect(screen.queryByText(/production-ready/i)).toBeNull()
		expect(screen.queryByText('0.0.0')).toBeNull()

		await user.click(screen.getByRole('button', { name: /About RahRow/ }))
		expect(screen.getByText('Version 2.4.1')).toBeTruthy()
		expect(
			screen.getAllByText(
				'A VPN and proxy client with support for multiple engines.',
			),
		).toHaveLength(2)
		expect(screen.getByRole('heading', { name: 'Support' })).toBeTruthy()
		expect(
			screen.getByRole('heading', { name: 'Source & licenses' }),
		).toBeTruthy()
		expect(screen.getByRole('heading', { name: 'Organization' })).toBeTruthy()
		expect(screen.getByText('sing-box, xray')).toBeTruthy()
		expect(screen.queryByRole('button', { name: 'Telegram channel' })).toBeNull()
		expect(screen.queryByRole('button', { name: 'Buy us a coffee' })).toBeNull()

		await user.click(screen.getByRole('button', { name: 'Email support' }))
		expect(externalOpen).toHaveBeenCalledWith(
			'mailto:falsefoundation.co@gmail.com',
		)
	})

	it('hides actions when the platform cannot open external destinations', async () => {
		runtime.capabilities.externalNavigation = undefined
		useSettings.mockReturnValue(settingsResult())
		const user = userEvent.setup()
		render(<Settings />)

		await user.click(screen.getByRole('button', { name: /About RahRow/ }))

		expect(screen.queryByRole('button', { name: 'Email support' })).toBeNull()
		expect(
			screen.getByText('External links are unavailable on this platform.'),
		).toBeTruthy()
	})

	it('keeps grouped About actions understandable in the RTL locale', async () => {
		await changeAppLanguage('fa')
		useSettings.mockReturnValue(settingsResult())
		const user = userEvent.setup()
		render(<Settings />)

		await user.click(screen.getByRole('button', { name: /درباره راهرو/ }))

		expect(document.documentElement.dir).toBe('rtl')
		expect(screen.getByRole('heading', { name: 'پشتیبانی' })).toBeTruthy()
		expect(screen.getByRole('button', { name: 'ایمیل پشتیبانی' })).toBeTruthy()
	})

	it.each([
		"Couldn't save settings. disk is read-only",
		"Couldn't reset settings. permission denied",
	])('announces operation failure: %s', async (failure) => {
		useSettings.mockReturnValue(settingsResult({ failure, message: failure }))
		render(<Settings />)

		await waitFor(() =>
			expect(toast.error).toHaveBeenCalledWith(
				'Settings could not be updated',
				expect.objectContaining({ description: failure }),
			),
		)
	})

	it('uses a factual fallback when build version metadata is absent', () => {
		useSettings.mockReturnValue(settingsResult({ appVersion: undefined }))
		render(<Settings />)

		expect(screen.getByText('Not provided by this build')).toBeTruthy()
		expect(screen.queryByText('0.0.0')).toBeNull()
	})
})
