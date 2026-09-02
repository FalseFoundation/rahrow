import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const useHome = vi.hoisted(() => vi.fn())
const navigate = vi.hoisted(() => vi.fn())
const toast = vi.hoisted(() => ({ dismiss: vi.fn(), error: vi.fn() }))

vi.mock('@tanstack/react-router', () => ({
	useNavigate: () => navigate,
}))

vi.mock('@rahrow/ui/components/ui/number-ticker.tsx', () => ({
	NumberTicker: ({ value }: { value: number }) => value,
}))
vi.mock('@rahrow/ui/components/ui/sonner.tsx', () => ({ toast }))

vi.mock('./useHome.ts', () => ({ useHome }))

import { Home } from './Home.tsx'

const profile: ConnectionProfile = {
	id: 'profile-1',
	protocol: 'vless',
	endpoint: { host: 'server.example', port: 443 },
	authentication: { id: '11111111-1111-4111-8111-111111111111' },
	metadata: { name: 'Example' },
}

function connectedState(
	egressIdentity:
		| {
				readonly status: 'available'
				readonly observation: {
					readonly ip: string
					readonly countryCode?: string
					readonly provider: 'cloudflare' | 'ipify'
				}
		  }
		| { readonly status: 'loading' | 'unavailable' } = {
		status: 'available',
		observation: {
			ip: '203.0.113.20',
			countryCode: 'NL',
			provider: 'cloudflare',
		},
	},
) {
	return {
		smartConnect: {
			state: {
				enabled: false,
				isLoading: false,
				status: 'unavailable' as const,
			},
			actions: {
				start: vi.fn(),
				run: vi.fn(),
				stop: vi.fn(),
				cancel: vi.fn(),
			},
		},
		state: {
			profiles: [profile],
			engineId: 'xray',
			selectedProfileId: profile.id,
			selectedProfile: profile,
			connectionState: 'connected',
			connectionMode: 'proxy',
			connectionLabel: 'Connected',
			engineStatus: 'running',
			localPort: 10808,
			egressIdentity,
			networkQuality: {
				status: 'complete' as const,
				result: {
					provider: 'cloudflare' as const,
					reachable: true,
					latencyMs: 28,
					downloadMbps: 8.39,
					downloadBytes: 1_048_576,
				},
			},
			latency: null,
			message: 'Connected',
			failure: null,
			initializationFailure: null,
			pendingAction: null,
			isPending: false,
			isInitialized: true,
			vpnSupported: true,
			systemProxySupported: true,
			connectUnavailableReason: null,
			canConnect: false,
			canDisconnect: true,
			profileLabel: () => 'Example',
		},
		actions: {
			selectProfile: vi.fn(),
			connect: vi.fn(),
			disconnect: vi.fn(),
			testSelected: vi.fn(),
			refresh: vi.fn(),
			retryFailure: vi.fn(),
		},
	}
}

describe('Home network identity', () => {
	beforeEach(() => {
		toast.dismiss.mockReset()
		toast.error.mockReset()
		useHome.mockReset()
		navigate.mockReset()
	})
	afterEach(cleanup)

	it('shows only the externally observed exit identity', () => {
		useHome.mockReturnValue(connectedState())

		render(<Home />)

		expect(screen.getByText('EXIT · IP')).toBeTruthy()
		expect(screen.getByText('203.0.113.20')).toBeTruthy()
		expect(
			screen.getByText(/Netherlands · Observed through Cloudflare/),
		).toBeTruthy()
		expect(screen.getByText('Cloudflare latency · 28 ms')).toBeTruthy()
		expect(screen.getByText('Download · 8.39 Mbps · 1 MiB sample')).toBeTruthy()
		expect(screen.queryByText('LOCAL · PROXY')).toBeNull()
		expect(screen.queryByText('127.0.0.1:10808')).toBeNull()
		expect(screen.queryByText('Loopback SOCKS listener')).toBeNull()
		expect(screen.queryByText('server.example:443')).toBeNull()
		expect(screen.queryByText('DEVICE · LAN')).toBeNull()
		expect(screen.queryByText('192.168.1.20')).toBeNull()
		expect(screen.queryByText(/RAHROW\s*·\s*SELECTED/i)).toBeNull()
	})

	it('labels observation failure without treating the connection as failed', () => {
		useHome.mockReturnValue(connectedState({ status: 'unavailable' }))

		render(<Home />)

		expect(screen.getByText('EXIT · IP')).toBeTruthy()
		expect(screen.getByText('Unavailable')).toBeTruthy()
		expect(
			screen.getByText(
				'The connection remains active. Try again after reconnecting.',
			),
		).toBeTruthy()
	})

	it('labels a failed Cloudflare check without changing connection state', () => {
		const current = connectedState()
		useHome.mockReturnValue({
			...current,
			state: {
				...current.state,
				networkQuality: {
					status: 'complete',
					result: {
						provider: 'cloudflare',
						reachable: false,
						error: 'network-test-unavailable',
					},
				},
			},
		})

		render(<Home />)

		expect(screen.getByText('PROXY ACTIVE')).toBeTruthy()
		expect(
			screen.getByText('Cloudflare round-trip check unavailable'),
		).toBeTruthy()
	})

	it('shows a safe initial-load alert with Retry instead of an empty state', async () => {
		const refresh = vi.fn().mockResolvedValue(undefined)
		const current = connectedState()
		useHome.mockReturnValue({
			...current,
			state: {
				...current.state,
				profiles: [],
				selectedProfile: undefined,
				isInitialized: false,
				canConnect: false,
				canDisconnect: false,
				initializationFailure: {
					title: "Couldn't load Home",
					description:
						'RahRow could not read your connections and current connection status.',
					detail:
						'Your connections were not changed. Try again or open Diagnostics.',
				},
			},
			actions: { ...current.actions, refresh },
		})

		const user = userEvent.setup()
		render(<Home />)

		const alert = screen.getByRole('alert')
		expect(alert.textContent).toContain("Couldn't load Home")
		expect(alert.textContent).not.toContain('sqlite')
		expect(
			screen.queryByText(/No connections yet|Choose a connection/),
		).toBeNull()
		expect(screen.queryByRole('button', { name: 'Connect' })).toBeNull()

		await user.click(screen.getByRole('button', { name: 'Retry' }))
		expect(refresh).toHaveBeenCalledOnce()
	})

	it('uses exact proxy wording without VPN protection claims', () => {
		useHome.mockReturnValue(connectedState())

		render(<Home />)

		expect(screen.getByText('PROXY ACTIVE')).toBeTruthy()
		expect(screen.getByText('System proxy connected')).toBeTruthy()
		expect(screen.getByText('System proxy is connected via VLESS')).toBeTruthy()
		expect(screen.queryByText(/Protected|Encrypted|secure tunnel/i)).toBeNull()
	})

	it('offers the same generic Smart Connect action from Home', async () => {
		const current = connectedState()
		const start = vi.fn().mockResolvedValue(undefined)
		useHome.mockReturnValue({
			...current,
			smartConnect: {
				...current.smartConnect,
				state: {
					enabled: false,
					isLoading: false,
					status: 'idle',
				},
				actions: { ...current.smartConnect.actions, start },
			},
		})

		const user = userEvent.setup()
		render(<Home />)
		const action = screen.getByRole('button', { name: 'Smart Connect' })
		expect(action.getAttribute('aria-pressed')).toBe('false')

		await user.click(action)
		expect(start).toHaveBeenCalledOnce()
	})

	it('uses the disconnect action whenever an active tunnel can be stopped', async () => {
		const current = connectedState()
		useHome.mockReturnValue({
			...current,
			state: {
				...current.state,
				connectionState: 'connecting',
				connectionLabel: 'Connecting',
				canDisconnect: true,
			},
		})

		const user = userEvent.setup()
		render(<Home />)
		await user.click(screen.getByRole('button', { name: 'Disconnect' }))

		expect(current.actions.disconnect).toHaveBeenCalledOnce()
		expect(current.actions.connect).not.toHaveBeenCalled()
	})

	it.each([
		['loading', { isInitialized: false, initializationFailure: null }],
		[
			'empty',
			{
				profiles: [],
				selectedProfile: undefined,
				isInitialized: true,
				initializationFailure: null,
			},
		],
		[
			'connecting',
			{
				connectionState: 'connecting',
				pendingAction: 'connect',
				isPending: true,
				canDisconnect: true,
			},
		],
		['connected', {}],
	] as const)(
		'keeps ProductHeader as the only h1 while %s',
		(_name, overrides) => {
			const current = connectedState()
			useHome.mockReturnValue({
				...current,
				state: { ...current.state, ...overrides },
			})

			render(<Home />)

			expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
			expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
				'RahRow',
			)
		},
	)

	it('shows safe recovery actions for a failed connection without exposing native detail', async () => {
		const retryFailure = vi.fn()
		const current = connectedState()
		useHome.mockReturnValue({
			...current,
			state: {
				...current.state,
				connectionState: 'disconnected',
				canConnect: true,
				canDisconnect: false,
				message: 'command rahrow_vpn_start exited with status 127',
				failure: {
					operation: 'connect',
					title: "Couldn't connect",
					description:
						'RahRow could not start the secure tunnel. Check Diagnostics, then try again.',
					retryLabel: 'Try again',
				},
			},
			actions: { ...current.actions, retryFailure },
		})

		render(<Home />)

		expect(toast.error).toHaveBeenCalledWith(
			"Couldn't connect",
			expect.objectContaining({
				description:
					'RahRow could not start the secure tunnel. Check Diagnostics, then try again.',
			}),
		)
		expect(screen.queryByText(/rahrow_vpn_start/i)).toBeNull()

		const options = toast.error.mock.calls.at(-1)?.[1]
		options?.action?.onClick()
		expect(retryFailure).toHaveBeenCalledOnce()
		options?.cancel?.onClick()
		expect(navigate).toHaveBeenCalledWith({
			to: '/settings',
			search: { drawer: 'diagnostics' },
		})
	})

	it('labels a measured round trip as latency', () => {
		const current = connectedState()
		useHome.mockReturnValue({
			...current,
			state: {
				...current.state,
				latency: { reachable: true, latencyMs: 42 },
			},
		})

		render(<Home />)

		expect(screen.getByText('LATENCY')).toBeTruthy()
		expect(screen.queryByText('SPEED TEST')).toBeNull()
		expect(screen.getByText('42 ms').getAttribute('dir')).toBe('ltr')
	})

	it('renders a zero-millisecond probe as an accessible red timeout', () => {
		const current = connectedState()
		useHome.mockReturnValue({
			...current,
			state: {
				...current.state,
				latency: { reachable: true, latencyMs: 0 },
			},
		})

		const { container } = render(<Home />)
		const timeout = screen.getByLabelText('Timeout')

		expect(timeout.getAttribute('data-latency-kind')).toBe('timeout')
		expect(timeout.textContent).toBe('Timeout')
		expect(container.textContent).not.toContain('0 ms')
	})

	it('disables Connect and shows the selected mode capability reason', () => {
		const current = connectedState()
		useHome.mockReturnValue({
			...current,
			state: {
				...current.state,
				connectionState: 'disconnected',
				connectionMode: 'vpn',
				canConnect: false,
				canDisconnect: false,
				connectUnavailableReason:
					'VPN mode is unavailable. Switch to System proxy in Settings.',
			},
		})

		render(<Home />)

		expect(
			(screen.getByRole('button', { name: 'Connect' }) as HTMLButtonElement)
				.disabled,
		).toBe(true)
		expect(
			screen.getByText(
				'VPN mode is unavailable. Switch to System proxy in Settings.',
			),
		).toBeTruthy()
	})
})
