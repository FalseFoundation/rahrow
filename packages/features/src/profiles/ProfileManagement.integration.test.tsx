// @vitest-environment jsdom

import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type { Subscription } from '@rahrow/core/subscription/subscription-import.ts'
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { LatencyProbeResult } from '../app/latency-presentation.ts'
import type { SmartConnectRuntime } from '../smart-connect/smart-connect-runtime.ts'
import { ProfileManagement } from './ProfileManagement.tsx'
import {
	publishProfileSpeedTestResults,
	resetProfileSpeedTestStore,
	setProfileSpeedTestProgress,
} from './profile-speed-test-store.ts'

const harness = vi.hoisted(() => ({
	actions: {
		activateProfile: vi.fn().mockResolvedValue(undefined),
		cancelSpeedTests: vi.fn(),
		deleteProfiles: vi.fn().mockResolvedValue(undefined),
		deleteSelected: vi.fn().mockResolvedValue(undefined),
		duplicateSelected: vi.fn().mockResolvedValue(undefined),
		importFromQr: vi.fn().mockResolvedValue(undefined),
		importProfiles: vi.fn().mockResolvedValue(undefined),
		pasteImportText: vi.fn().mockResolvedValue(undefined),
		reloadProfiles: vi.fn().mockResolvedValue(undefined),
		saveProfile: vi.fn().mockResolvedValue(undefined),
		selectProfile: vi.fn(),
		setImportText: vi.fn(),
		setConnectionGroupOpen: vi.fn(),
		setConnectionsQuery: vi.fn(),
		setConnectionsSort: vi.fn(),
		setConnectionsHideUnreachable: vi.fn(),
		setConnectionsViewport: vi.fn(),
		pruneConnectionGroups: vi.fn(),
		setProfileName: vi.fn(),
		testProfiles: vi.fn().mockResolvedValue(undefined),
		updateSelectedName: vi.fn().mockResolvedValue(undefined),
	},
	drawerRoot: vi.fn(),
	navigate: vi.fn().mockResolvedValue(undefined),
	shareOpen: vi.fn(),
	state: {
		importText: '',
		isLoading: false,
		message: 'Ready',
		connectionsView: {
			version: 1 as const,
			groupOpen: {} as Record<string, boolean>,
			query: '',
			sort: 'default' as const,
		},
		connectionsViewWarning: undefined as string | undefined,
		profileName: '',
		profiles: [] as ConnectionProfile[],
		selectedId: '',
		speedTests: {} as Record<string, LatencyProbeResult | undefined>,
		speedTestingIds: new Set<string>(),
	},
	virtualizer: vi.fn(),
}))

vi.mock('./useProfileManagement.ts', async () => {
	const React = await import('react')
	return {
		useProfileManagement: () => {
			const [connectionsView, setConnectionsView] = React.useState(
				harness.state.connectionsView,
			)
			return {
				state: { ...harness.state, connectionsView },
				actions: {
					...harness.actions,
					setConnectionsQuery: (query: string) => {
						harness.actions.setConnectionsQuery(query)
						setConnectionsView((current) => ({ ...current, query }))
					},
					setConnectionsSort: (sort: typeof connectionsView.sort) => {
						harness.actions.setConnectionsSort(sort)
						setConnectionsView((current) => ({ ...current, sort }))
					},
					setConnectionsHideUnreachable: (hideUnreachable: boolean) => {
						harness.actions.setConnectionsHideUnreachable(hideUnreachable)
						setConnectionsView((current) => ({
							...current,
							hideUnreachable: hideUnreachable || undefined,
						}))
					},
					setConnectionGroupOpen: (key: string, open: boolean) => {
						harness.actions.setConnectionGroupOpen(key, open)
						setConnectionsView((current) => ({
							...current,
							groupOpen: { ...current.groupOpen, [key]: open },
						}))
					},
				},
			}
		},
	}
})

vi.mock('./usePullToRefresh.ts', () => ({
	usePullToRefresh: () => ({ armed: false, distance: 0, refreshing: false }),
}))

vi.mock('../app/app-scroll-context.tsx', () => ({
	useAppScrollViewport: () => ({ current: null }),
}))

vi.mock('../share/ShareDrawer.tsx', () => ({
	ShareDrawerOutlet: () => null,
	useShareDrawer: () => ({ close: vi.fn(), open: harness.shareOpen }),
}))

vi.mock('@tanstack/react-router', () => ({
	useNavigate: () => harness.navigate,
}))

vi.mock('@tanstack/react-pacer', async (importOriginal) => ({
	...(await importOriginal<typeof import('@tanstack/react-pacer')>()),
	useThrottledCallback: (callback: (...args: never[]) => unknown) => callback,
}))

vi.mock('@tanstack/react-virtual', () => ({
	useVirtualizer: (options: { count: number }) => {
		harness.virtualizer(options)
		return {
			getTotalSize: () => options.count * 60,
			getVirtualItems: () =>
				Array.from({ length: Math.min(options.count, 2) }, (_, index) => ({
					index,
					key: `row-${index}`,
					size: 60,
					start: index * 60,
				})),
			measureElement: vi.fn(),
			takeSnapshot: vi.fn(() => []),
		}
	},
}))

vi.mock('@rahrow/ui/components/ui/collapsible.tsx', async () => {
	const React = await import('react')
	const DisclosureContext = React.createContext({
		open: true,
		onOpenChange: (_open: boolean): void => undefined,
	})
	return {
		Collapsible: ({
			children,
			open,
			onOpenChange,
		}: {
			children: React.ReactNode
			open: boolean
			onOpenChange: (open: boolean) => void
		}) =>
			React.createElement(
				DisclosureContext.Provider,
				{ value: { open, onOpenChange } },
				React.createElement('section', null, children),
			),
		CollapsibleContent: ({ children }: { children: React.ReactNode }) => {
			const disclosure = React.useContext(DisclosureContext)
			return disclosure.open ? React.createElement('div', null, children) : null
		},
		CollapsibleTrigger: ({
			children,
			render,
		}: {
			children: React.ReactNode
			render?: React.ReactElement<{ 'aria-label'?: string }>
		}) => {
			const disclosure = React.useContext(DisclosureContext)
			return React.createElement(
				'button',
				{
					'aria-label': render?.props['aria-label'],
					'aria-expanded': disclosure.open,
					onClick: () => disclosure.onOpenChange(!disclosure.open),
					type: 'button',
				},
				children,
			)
		},
	}
})

vi.mock('@rahrow/ui/components/ui/drawer.tsx', async () => {
	const React = await import('react')
	const Element = ({ children }: { children?: React.ReactNode }) =>
		React.createElement('div', null, children)
	return {
		Drawer: ({
			children,
			disablePointerDismissal,
			open,
			showSwipeHandle,
		}: {
			children: React.ReactNode
			disablePointerDismissal?: boolean
			open?: boolean
			showSwipeHandle?: boolean
		}) => {
			harness.drawerRoot({ disablePointerDismissal, open, showSwipeHandle })
			return open ? React.createElement('div', null, children) : null
		},
		DrawerBody: Element,
		DrawerContent: Element,
		DrawerDescription: Element,
		DrawerFooter: Element,
		DrawerHeader: Element,
		DrawerTitle: Element,
	}
})

vi.mock('@rahrow/ui/components/ui/number-ticker.tsx', () => ({
	NumberTicker: ({ value }: { value: number }) => value,
}))

vi.mock('@rahrow/ui/components/ui/toggle-group.tsx', async () => {
	const React = await import('react')
	const ChangeContext = React.createContext<(value: string) => void>(() => {})
	return {
		ToggleGroup: ({
			children,
			onValueChange,
		}: {
			children: React.ReactNode
			onValueChange: (values: string[]) => void
		}) =>
			React.createElement(
				ChangeContext.Provider,
				{ value: (value: string) => onValueChange([value]) },
				children,
			),
		ToggleGroupItem: ({
			children,
			value,
		}: {
			children: React.ReactNode
			value: string
		}) => {
			const onChange = React.useContext(ChangeContext)
			return React.createElement(
				'button',
				{ onClick: () => onChange(value) },
				children,
			)
		},
	}
})

function profile(
	id: string,
	name: string,
	host: string,
	options: {
		protocol?: ConnectionProfile['protocol']
		subscriptionId?: string
	} = {},
): ConnectionProfile {
	return {
		id,
		protocol: options.protocol ?? 'vmess',
		endpoint: { host, port: 443 },
		metadata: {
			name,
			...(options.subscriptionId
				? {
						source: 'subscription' as const,
						subscriptionId: options.subscriptionId,
					}
				: { source: 'manual' as const }),
		},
	}
}

const subscriptions: Subscription[] = [
	{
		id: 'locked-source',
		url: 'https://example.com/locked',
		name: 'Locked source',
		locked: true,
	},
]

function renderManagement(
	overrides: Partial<React.ComponentProps<typeof ProfileManagement>> = {},
) {
	publishProfileSpeedTestResults(
		Object.fromEntries(
			Object.entries(harness.state.speedTests).map(([profileId, result]) => [
				profileId,
				result
					? {
							profileId,
							checkedAt: '2026-08-31T12:00:00.000Z',
							reachable: result.reachable ?? false,
							latencyMs: result.latencyMs,
							error: result.error,
						}
					: undefined,
			]),
		),
	)
	const props = {
		capabilities: {
			clipboard: { read: vi.fn(), write: vi.fn() },
			qrEncoder: { encode: vi.fn() },
		},
		engine: {
			manifest: { supportedProtocols: [] },
			test: vi.fn(async (target: ConnectionProfile) => ({
				profileId: target.id,
				reachable: true,
				latencyMs: 12,
				checkedAt: '2026-09-01T00:00:00.000Z',
			})),
		},
		logger: {
			child: () => ({
				info: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
				debug: vi.fn(),
			}),
		},
		onAddSubscription: vi.fn().mockResolvedValue(undefined),
		onRefreshSubscription: vi.fn().mockResolvedValue(undefined),
		onRefreshSubscriptions: vi.fn().mockResolvedValue(undefined),
		onRemoveSubscription: vi.fn().mockResolvedValue(undefined),
		onUpdateSubscription: vi.fn().mockResolvedValue(undefined),
		onReloadSubscriptions: vi.fn().mockResolvedValue(undefined),
		profileStore: {
			list: vi.fn(async () => harness.state.profiles),
			replaceAll: vi.fn().mockResolvedValue(undefined),
		},
		registry: { serialize: vi.fn((value: ConnectionProfile) => value.id) },
		subscriptionMessage: 'Subscriptions ready',
		subscriptionFetcher: { fetch: vi.fn().mockResolvedValue('profile data') },
		subscriptionStore: {
			list: vi.fn(async () => subscriptions),
			replaceAll: vi.fn().mockResolvedValue(undefined),
		},
		subscriptions,
		...overrides,
	} as unknown as React.ComponentProps<typeof ProfileManagement>

	return { ...render(<ProfileManagement {...props} />), props }
}

function connectionRow(name: string): HTMLElement {
	const row = screen
		.getAllByText(name)
		.map((element) => element.closest('[data-slot="item"]'))
		.find((element) => element instanceof HTMLElement)
	if (!(row instanceof HTMLElement)) {
		throw new Error(`Expected the ${name} connection row`)
	}
	return row
}

function connectionAction(name: string, label: string): HTMLElement {
	const button = connectionRow(name).querySelector(
		`button[aria-label="${label}"]`,
	)
	if (!(button instanceof HTMLElement)) {
		throw new Error(`Expected ${label} in the ${name} connection row`)
	}
	return button
}

describe('ProfileManagement connection-library seam', () => {
	afterEach(cleanup)

	beforeEach(() => {
		vi.clearAllMocks()
		resetProfileSpeedTestStore()
		harness.state.profiles = [
			profile('zeta', 'Zeta', 'zeta.example'),
			profile('alpha', 'Alpha', 'alpha.example'),
			profile('wire', 'Wire route', 'wire.example', {
				protocol: 'shadowsocks',
				subscriptionId: 'locked-source',
			}),
		]
		harness.state.selectedId = 'zeta'
		harness.state.speedTests = {
			alpha: { reachable: true, latencyMs: 80 },
			wire: { reachable: true, latencyMs: 20 },
		}
		harness.state.speedTestingIds = new Set()
		harness.state.importText = ''
		harness.state.connectionsView = {
			version: 1,
			groupOpen: {},
			query: '',
			sort: 'default',
		}
	})

	it('keeps measured ping values and their unit left-to-right', () => {
		renderManagement({ subscriptions: [] })

		expect(screen.getByText('80 ms').getAttribute('dir')).toBe('ltr')
		expect(screen.getByText('20 ms').getAttribute('dir')).toBe('ltr')
	})

	it('renders zero latency as timeout without invoking NumberTicker', () => {
		harness.state.speedTests = {
			zeta: { reachable: true, latencyMs: 0 },
		}
		const { container } = renderManagement({ subscriptions: [] })
		const timeout = screen.getByLabelText('Timeout')

		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
		expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(0)
		expect(timeout.getAttribute('data-latency-kind')).toBe('timeout')
		expect(timeout.textContent).toBe('Timeout')
		expect(container.textContent).not.toContain('0 ms')
	})

	it('renders restored disclosure state as controlled before interaction', () => {
		harness.state.connectionsView = {
			version: 1,
			groupOpen: { standalone: false },
			query: '',
			sort: 'default',
		}
		renderManagement({ subscriptions: [] })

		const trigger = screen.getByRole('button', {
			name: 'Expand group',
		})
		expect(trigger.getAttribute('aria-expanded')).toBe('false')
		expect(screen.queryByText('Zeta')).toBeNull()

		fireEvent.click(trigger)
		expect(harness.actions.setConnectionGroupOpen).toHaveBeenCalledWith(
			'standalone',
			true,
		)
	})

	it('reconciles persisted group identities when subscriptions are removed', async () => {
		const rendered = renderManagement()

		await waitFor(() =>
			expect(harness.actions.pruneConnectionGroups).toHaveBeenCalled(),
		)
		const initialKeys =
			harness.actions.pruneConnectionGroups.mock.calls.at(-1)?.[0]
		expect(initialKeys).toEqual(
			new Set(['standalone', 'subscription:locked-source']),
		)

		rendered.rerender(
			<ProfileManagement {...rendered.props} subscriptions={[]} />,
		)
		await waitFor(() => {
			const activeKeys =
				harness.actions.pruneConnectionGroups.mock.calls.at(-1)?.[0]
			expect(activeKeys).toEqual(new Set(['standalone', 'orphaned:locked-source']))
		})
	})

	it('opens the same canonical creator from the first-run CTA and toolbar', () => {
		harness.state.profiles = []
		renderManagement({ subscriptions: [] })

		expect(screen.getByText('No connections yet')).toBeTruthy()
		const entryPoints = screen.getAllByRole('button', { name: 'Add connection' })
		expect(entryPoints).toHaveLength(2)
		const emptyCta = entryPoints.at(1)
		if (!emptyCta) throw new Error('Expected an empty-state Add connection CTA')

		fireEvent.click(emptyCta)
		expect(
			screen.getByRole('tablist', { name: 'Connection import method' }),
		).toBeTruthy()
		expect(screen.getByText(/Add a connection from a URL/)).toBeTruthy()

		fireEvent.click(screen.getByRole('button', { name: 'Close drawer' }))
		const toolbarAction = screen
			.getAllByRole('button', { name: 'Add connection' })
			.at(0)
		if (!toolbarAction)
			throw new Error('Expected a toolbar Add connection action')
		fireEvent.click(toolbarAction)
		expect(
			screen.getByRole('tablist', { name: 'Connection import method' }),
		).toBeTruthy()
	})

	it('keeps only Add connection when the canonical collection is empty', () => {
		harness.state.profiles = []
		renderManagement({ subscriptions: [] })

		expect(
			screen.getAllByRole('button', { name: 'Add connection' }),
		).toHaveLength(2)
		expect(
			screen.queryByRole('button', { name: 'Clean up connections' }),
		).toBeNull()
		expect(screen.queryByRole('button', { name: 'Open search' })).toBeNull()
		expect(screen.queryByRole('button', { name: 'Sort connections' })).toBeNull()
	})

	it('shows only collection actions with a valid target for a subscription-only library', () => {
		harness.state.profiles = []
		renderManagement()

		expect(
			screen.getByRole('button', { name: 'Clean up connections' }),
		).toBeTruthy()
		expect(screen.queryByRole('button', { name: 'Open search' })).toBeNull()
		expect(screen.queryByRole('button', { name: 'Sort connections' })).toBeNull()
	})

	it('completes canonical URL acquisition from the first-run CTA', async () => {
		harness.state.profiles = []
		harness.state.importText = 'vless://first-run-profile'
		renderManagement({ subscriptions: [] })

		const emptyCta = screen
			.getAllByRole('button', { name: 'Add connection' })
			.at(1)
		if (!emptyCta) throw new Error('Expected an empty-state Add connection CTA')
		fireEvent.click(emptyCta)

		const submit = screen
			.getAllByRole('button', { name: 'Add connection' })
			.at(-1)
		if (!submit) throw new Error('Expected the canonical URL submit action')
		fireEvent.click(submit)

		await waitFor(() =>
			expect(harness.actions.importProfiles).toHaveBeenCalledWith(
				'url',
				'vless://first-run-profile',
			),
		)
		expect(
			screen.queryByRole('tablist', { name: 'Connection import method' }),
		).toBeNull()
	})

	it('searches by name, protocol, and endpoint while preserving ownership groups', async () => {
		renderManagement()

		expect(screen.getByText('Profiles')).toBeTruthy()
		expect(screen.getByText('Locked source')).toBeTruthy()
		fireEvent.click(screen.getByRole('button', { name: 'Open search' }))
		fireEvent.change(
			screen.getByRole('textbox', { name: 'Search connections' }),
			{
				target: { value: 'shadowsocks' },
			},
		)

		await waitFor(() => expect(screen.getByText('Wire route')).toBeTruthy())
		await waitFor(() => expect(screen.queryByText('Alpha')).toBeNull())
		expect(screen.getByText('Locked source')).toBeTruthy()
	})

	it('sorts visible connections and activates the named target', async () => {
		renderManagement()

		fireEvent.click(screen.getByRole('button', { name: 'Sort connections' }))
		fireEvent.click(screen.getByRole('button', { name: 'Name' }))
		await waitFor(() => {
			const profileOrder = [...document.querySelectorAll('[data-profile-id]')].map(
				(button) => button.getAttribute('data-profile-id'),
			)
			expect(profileOrder.indexOf('alpha')).toBeLessThan(
				profileOrder.indexOf('zeta'),
			)
		})

		fireEvent.click(connectionAction('Alpha', 'Use connection'))
		await waitFor(() =>
			expect(harness.actions.activateProfile).toHaveBeenCalledWith(
				expect.objectContaining({ id: 'alpha' }),
			),
		)
		expect(harness.navigate).toHaveBeenCalledWith({ to: '/' })
	})

	it('names action targets and keeps locked mutation actions disabled', async () => {
		const { props } = renderManagement()

		const lockedSourceHeading = screen.getByRole('heading', {
			name: 'Locked source',
		})
		const lockedSourceGroup = lockedSourceHeading.closest('section')
		if (!lockedSourceGroup) throw new Error('Expected the locked source group')
		const sourceActions = lockedSourceGroup.querySelector(
			'button[aria-label="More actions"]',
		)
		if (!(sourceActions instanceof HTMLElement)) {
			throw new Error('Expected the locked source actions')
		}
		fireEvent.click(sourceActions)
		expect(screen.getAllByText('Locked source').length).toBeGreaterThan(1)
		expect(
			screen.getByText(
				/Locked source is locked.*unlock it before editing or removing/i,
			),
		).toBeTruthy()
		const remove = screen.getByRole('button', { name: 'Remove' })
		expect(screen.getByRole('button', { name: 'Edit' })).toHaveProperty(
			'disabled',
			true,
		)
		expect(remove).toHaveProperty('disabled', true)
		expect(remove.className).toContain('text-destructive')

		fireEvent.click(screen.getByRole('button', { name: 'Reload' }))
		await waitFor(() =>
			expect(props.onRefreshSubscription).toHaveBeenCalledWith(subscriptions[0]),
		)
		expect(harness.actions.reloadProfiles).toHaveBeenCalled()
	})

	it('counts owned profiles in subscription removal consequences', () => {
		const subscription = subscriptions[0]
		if (!subscription) throw new Error('Expected a subscription fixture')
		const source = { ...subscription, locked: false }
		renderManagement({ subscriptions: [source] })

		const sourceHeading = screen.getByRole('heading', { name: 'Locked source' })
		const sourceGroup = sourceHeading.closest('section')
		const actions = sourceGroup?.querySelector(
			'button[aria-label="More actions"]',
		)
		if (!(actions instanceof HTMLElement)) {
			throw new Error('Expected the subscription actions')
		}
		fireEvent.click(actions)
		fireEvent.click(screen.getByRole('button', { name: 'Remove' }))

		expect(
			screen.getByText(
				/This also removes 1 connection owned by this subscription\./,
			),
		).toBeTruthy()
	})

	it('opens profile actions without changing the active connection', () => {
		renderManagement()

		fireEvent.click(connectionAction('Alpha', 'More actions'))

		expect(harness.actions.selectProfile).not.toHaveBeenCalled()
		expect(
			connectionAction('Zeta', 'Use connection').getAttribute('aria-current'),
		).toBe('true')
		expect(
			connectionAction('Alpha', 'Use connection').getAttribute('aria-current'),
		).toBeNull()
		expect(screen.getAllByText('Alpha').length).toBeGreaterThan(1)
		expect(
			screen.queryByText(
				'Test, duplicate, share, edit, or remove Alpha. Removal requires confirmation.',
			),
		).toBeNull()
	})

	it('inherits lock protection into subscription-owned profile actions', () => {
		renderManagement()

		fireEvent.click(connectionAction('Wire route', 'More actions'))
		expect(screen.getByRole('button', { name: 'Edit' })).toHaveProperty(
			'disabled',
			true,
		)
		expect(screen.getByRole('button', { name: 'Remove' })).toHaveProperty(
			'disabled',
			true,
		)
		expect(screen.getAllByText('Locked').length).toBeGreaterThan(0)
	})

	it('closes latency actions immediately and shows progress on the affected row', () => {
		harness.state.speedTestingIds = new Set(['alpha'])
		renderManagement()

		expect(screen.getByLabelText('Testing Alpha')).toBeTruthy()
		fireEvent.click(connectionAction('Alpha', 'More actions'))
		fireEvent.click(screen.getByRole('button', { name: 'Test latency' }))
		expect(harness.actions.testProfiles).toHaveBeenCalledWith(
			[expect.objectContaining({ id: 'alpha' })],
			'profile-ping',
		)
		expect(screen.queryByRole('button', { name: 'Test latency' })).toBeNull()
	})

	it('shows aggregate speed-test progress above the collection and can cancel it', () => {
		setProfileSpeedTestProgress({
			completed: 17,
			pending: 23,
			total: 40,
			status: 'running',
		})
		renderManagement()

		const progress = screen.getByRole('progressbar', {
			name: 'Speed test progress',
		})
		expect(progress.getAttribute('aria-valuenow')).toBe('42.5')
		expect(screen.getByText('17 of 40 connections tested')).toBeTruthy()

		fireEvent.click(screen.getByRole('button', { name: 'Cancel speed test' }))
		expect(harness.actions.cancelSpeedTests).toHaveBeenCalledOnce()
	})

	it('virtualizes lists only after the compact-list threshold', () => {
		harness.state.profiles = Array.from({ length: 13 }, (_, index) =>
			profile(`profile-${index}`, `Profile ${index}`, `host-${index}.example`),
		)

		renderManagement({ subscriptions: [] })

		expect(harness.virtualizer).toHaveBeenCalledWith(
			expect.objectContaining({ count: 14, overscan: 6, useFlushSync: false }),
		)
		expect(screen.getByText('Profile 0')).toBeTruthy()
	})

	it('checks first and requires irreversible cleanup confirmation before removal', async () => {
		const engine = {
			manifest: { supportedProtocols: [] },
			test: vi.fn(async (target: ConnectionProfile) => ({
				profileId: target.id,
				reachable: target.id !== 'zeta',
				...(target.id === 'zeta' ? { error: 'Timed out' } : { latencyMs: 12 }),
				checkedAt: '2026-09-01T00:00:00.000Z',
			})),
		}
		const rendered = renderManagement({ engine } as never)

		fireEvent.click(screen.getByRole('button', { name: 'Clean up connections' }))
		expect(screen.getByText('Network and battery use')).toBeTruthy()
		expect(screen.getByText(/does not remove or refresh anything/i)).toBeTruthy()

		fireEvent.click(screen.getByRole('button', { name: 'Check all' }))
		await waitFor(() =>
			expect(screen.getByText('Review before removing')).toBeTruthy(),
		)
		const remove = screen.getByRole('button', { name: 'Remove failed (1)' })
		expect(remove).toHaveProperty('disabled', true)

		fireEvent.click(
			screen.getByText(/I understand that cleanup cannot be undone/i),
		)
		expect(remove).toHaveProperty('disabled', false)
		fireEvent.click(remove)

		await waitFor(() =>
			expect(rendered.props.profileStore.replaceAll).toHaveBeenCalled(),
		)
		expect(rendered.props.profileStore.replaceAll).toHaveBeenCalledWith([
			expect.objectContaining({ id: 'alpha' }),
			expect.objectContaining({ id: 'wire' }),
		])
		expect(screen.getByText('Cleanup complete')).toBeTruthy()
	})

	it('locks every drawer dismissal affordance while cleanup is checking', async () => {
		harness.state.profiles = [profile('alpha', 'Alpha', 'alpha.example')]
		const engine = {
			manifest: { supportedProtocols: [] },
			test: vi.fn(
				() =>
					new Promise<never>(() => {
						// Keep the probe active until the queue is explicitly canceled.
					}),
			),
		}
		renderManagement({ engine, subscriptions: [] } as never)

		fireEvent.click(screen.getByRole('button', { name: 'Clean up connections' }))
		fireEvent.click(screen.getByRole('button', { name: 'Check all' }))

		await waitFor(() =>
			expect(harness.drawerRoot).toHaveBeenLastCalledWith(
				expect.objectContaining({
					disablePointerDismissal: true,
					open: true,
					showSwipeHandle: false,
				}),
			),
		)
		expect(screen.getByRole('button', { name: 'Close drawer' })).toHaveProperty(
			'disabled',
			true,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Cancel check' }))
		await waitFor(() => expect(screen.getByText('Check canceled')).toBeTruthy())
		expect(screen.getByRole('button', { name: 'Close drawer' })).toHaveProperty(
			'disabled',
			false,
		)
		expect(harness.drawerRoot).toHaveBeenLastCalledWith(
			expect.objectContaining({
				disablePointerDismissal: false,
				open: true,
				showSwipeHandle: true,
			}),
		)
	})

	it('starts Smart Connect from the generic header action and reports its selection', async () => {
		const run = vi.fn(async ({ onProgress }) => {
			onProgress?.({ phase: 'queued', total: 2 })
			onProgress?.({
				phase: 'testing',
				active: 1,
				completed: 1,
				started: 2,
				total: 2,
			})
			return {
				outcome: 'selected' as const,
				probed: 2,
				winner: { profileId: 'alpha', latencyMs: 12 },
				nextRunAt: '2026-09-02T00:05:00.000Z',
			}
		})
		const smartConnect = {
			orchestrator: {
				status: vi.fn().mockResolvedValue({ enabled: false }),
				start: vi.fn().mockResolvedValue({ enabled: true }),
				stop: vi.fn().mockResolvedValue({ enabled: false }),
				run,
			},
			schedule: { resume: vi.fn().mockResolvedValue(undefined) },
		} as unknown as SmartConnectRuntime
		renderManagement({ smartConnect, subscriptions: [] })
		const action = await screen.findByRole('button', { name: 'Smart Connect' })

		expect(action.getAttribute('aria-pressed')).toBe('false')
		fireEvent.click(action)

		await waitFor(() => expect(run).toHaveBeenCalledOnce())
		await waitFor(() =>
			expect(screen.getByText('Fastest connection selected')).toBeTruthy(),
		)
		expect(action.getAttribute('aria-pressed')).toBe('true')
	})

	it('opens the runtime-backed raw engine document workspace', () => {
		renderManagement({
			rawEngineDocuments: {
				adapters: [],
				storeFor: vi.fn(),
			},
			subscriptions: [],
		} as never)

		fireEvent.click(
			screen.getByRole('button', { name: 'Import raw engine configuration' }),
		)

		expect(
			screen.getAllByRole('heading', { name: 'Raw engine configuration' }),
		).not.toHaveLength(0)
	})
})
