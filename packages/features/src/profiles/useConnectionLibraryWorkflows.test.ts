import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useConnectionLibraryWorkflows } from './useConnectionLibraryWorkflows.ts'
import type { useProfileManagement } from './useProfileManagement.ts'

type Actions = ReturnType<typeof useProfileManagement>['actions']

const profile: ConnectionProfile = {
	id: 'alpha',
	protocol: 'vmess',
	endpoint: { host: 'alpha.example', port: 443 },
	metadata: { name: 'Alpha', source: 'manual' },
}

function actions(): Actions {
	return {
		activateProfile: vi.fn().mockResolvedValue(undefined),
		deleteProfiles: vi.fn().mockResolvedValue(undefined),
		importProfiles: vi.fn().mockResolvedValue(undefined),
		reloadProfiles: vi.fn().mockResolvedValue(undefined),
		saveProfile: vi.fn().mockResolvedValue(undefined),
		testProfiles: vi.fn().mockResolvedValue(undefined),
	} as unknown as Actions
}

describe('useConnectionLibraryWorkflows', () => {
	it('owns action targeting, sharing serialization, and drawer transitions', async () => {
		const profileActions = actions()
		const openShare = vi.fn()
		const { result } = renderHook(() =>
			useConnectionLibraryWorkflows({
				actions: profileActions,
				registry: { serialize: ({ id }) => `serialized:${id}` },
				subscriptions: [],
				onAddSubscription: vi.fn(),
				onRefreshSubscription: vi.fn(),
				onRefreshSubscriptions: vi.fn(),
				onRemoveSubscription: vi.fn(),
				onUpdateSubscription: vi.fn(),
				openShare,
				onProfileActivated: vi.fn(),
			}),
		)

		act(() => result.current.openActions({ kind: 'profile', profile }))
		expect(result.current.drawerCopy).toEqual({
			title: 'Alpha',
		})

		await act(() => result.current.exportTarget())
		expect(openShare).toHaveBeenCalledWith({
			title: 'Alpha',
			label: 'Connection URL',
			value: 'serialized:alpha',
			filename: 'Alpha',
		})
		expect(result.current.drawer).toBe('actions')

		act(() => result.current.beginEdit())
		expect(result.current.drawer).toBe('actions')
		expect(result.current.nestedDrawer).toBe('edit-profile')
	})

	it('owns subscription refresh and destructive workflows', async () => {
		const profileActions = actions()
		const subscription = { id: 'source', url: 'https://example.com' }
		const onRefreshSubscription = vi.fn().mockResolvedValue(undefined)
		const onRefreshSubscriptions = vi.fn().mockResolvedValue(undefined)
		const onRemoveSubscription = vi.fn().mockResolvedValue(undefined)
		const openShare = vi.fn()
		const { result } = renderHook(() =>
			useConnectionLibraryWorkflows({
				actions: profileActions,
				registry: { serialize: ({ id }) => id },
				subscriptions: [subscription],
				onAddSubscription: vi.fn(),
				onRefreshSubscription,
				onRefreshSubscriptions,
				onRemoveSubscription,
				onUpdateSubscription: vi.fn(),
				openShare,
				onProfileActivated: vi.fn(),
			}),
		)

		act(() =>
			result.current.openActions({
				kind: 'subscription',
				subscription,
				profiles: [profile],
			}),
		)
		await act(() => result.current.refreshSubscription(subscription))
		expect(onRefreshSubscription).toHaveBeenCalledWith(subscription)
		expect(profileActions.reloadProfiles).toHaveBeenCalled()

		await act(() => result.current.refreshConnections())
		expect(onRefreshSubscriptions).toHaveBeenCalledOnce()
		expect(onRefreshSubscriptions).toHaveBeenCalledWith([subscription])

		await act(() => result.current.exportTarget())
		expect(openShare).toHaveBeenCalledWith({
			title: 'RahRow subscription',
			description: 'Share the original subscription source.',
			label: 'Subscription URL',
			value: 'https://example.com',
			filename: 'RahRow subscription',
		})

		act(() => result.current.requestDelete())
		expect(result.current.deleteOpen).toBe(true)
		expect(result.current.drawer).toBe('actions')
		await act(() => result.current.confirmDelete())
		expect(onRemoveSubscription).toHaveBeenCalledWith('source')
		expect(result.current.deleteOpen).toBe(false)
	})

	it('keeps the destructive workflow open with recovery state when removal fails', async () => {
		const subscription = { id: 'source', url: 'https://example.com' }
		const onRemoveSubscription = vi.fn().mockRejectedValue(new Error('offline'))
		const { result } = renderHook(() =>
			useConnectionLibraryWorkflows({
				actions: actions(),
				registry: { serialize: ({ id }) => id },
				subscriptions: [subscription],
				onAddSubscription: vi.fn(),
				onRefreshSubscription: vi.fn(),
				onRefreshSubscriptions: vi.fn(),
				onRemoveSubscription,
				onUpdateSubscription: vi.fn(),
				openShare: vi.fn(),
				onProfileActivated: vi.fn(),
			}),
		)

		act(() => {
			result.current.openActions({
				kind: 'subscription',
				subscription,
				profiles: [profile],
			})
			result.current.requestDelete()
		})
		await act(() => result.current.confirmDelete())

		expect(result.current.drawer).toBe('actions')
		expect(result.current.deleteOpen).toBe(true)
		expect(result.current.mutationPending).toBe(false)
		expect(result.current.mutationError).toBeTruthy()
	})

	it('deduplicates repeated destructive confirmation while removal is pending', async () => {
		let resolveRemoval: (() => void) | undefined
		const removal = new Promise<void>((resolve) => {
			resolveRemoval = resolve
		})
		const subscription = { id: 'source', url: 'https://example.com' }
		const onRemoveSubscription = vi.fn(() => removal)
		const { result } = renderHook(() =>
			useConnectionLibraryWorkflows({
				actions: actions(),
				registry: { serialize: ({ id }) => id },
				subscriptions: [subscription],
				onAddSubscription: vi.fn(),
				onRefreshSubscription: vi.fn(),
				onRefreshSubscriptions: vi.fn(),
				onRemoveSubscription,
				onUpdateSubscription: vi.fn(),
				openShare: vi.fn(),
				onProfileActivated: vi.fn(),
			}),
		)

		act(() => {
			result.current.openActions({
				kind: 'subscription',
				subscription,
				profiles: [profile],
			})
			result.current.requestDelete()
		})
		let first: Promise<void> | undefined
		act(() => {
			first = result.current.confirmDelete()
			void result.current.confirmDelete()
		})
		expect(result.current.mutationPending).toBe(true)
		expect(onRemoveSubscription).toHaveBeenCalledOnce()

		resolveRemoval?.()
		await act(() => first)
		expect(result.current.deleteOpen).toBe(false)
	})
})
