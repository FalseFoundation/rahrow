// @vitest-environment jsdom

import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type { Subscription } from '@rahrow/core/subscription/subscription-import.ts'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useConnectionCleanup } from './useConnectionCleanup.ts'

const scan = vi.hoisted(() => vi.fn())

vi.mock('./connection-cleanup-work.ts', () => ({
	scanConnectionsForCleanup: scan,
}))

const profile = (id: string, subscriptionId?: string): ConnectionProfile => ({
	id,
	protocol: 'vmess',
	endpoint: { host: `${id}.example`, port: 443 },
	metadata: subscriptionId
		? { source: 'subscription', subscriptionId }
		: { source: 'manual' },
})

function setup() {
	const recordActionEvent = vi.fn(async () => ({
		status: 'recorded' as const,
		obligation: null,
	}))
	let profiles: readonly ConnectionProfile[] = [
		profile('keep'),
		profile('remove'),
	]
	let subscriptions: readonly Subscription[] = [
		{ id: 'keep-source', url: 'https://keep.example' },
		{ id: 'remove-source', url: 'https://remove.example' },
	]
	const replaceProfiles = vi.fn(async (next: readonly ConnectionProfile[]) => {
		profiles = [...next]
	})
	const replaceSubscriptions = vi.fn(async (next: readonly Subscription[]) => {
		subscriptions = [...next]
	})
	const dependencies = {
		profiles,
		subscriptions,
		engine: { test: vi.fn(), manifest: { supportedProtocols: [] }, id: 'test' },
		subscriptionFetcher: { fetch: vi.fn() },
		profileStore: {
			list: vi.fn(async () => profiles),
			get: vi.fn(),
			save: vi.fn(),
			remove: vi.fn(),
			replaceAll: replaceProfiles,
		},
		subscriptionStore: {
			list: vi.fn(async () => subscriptions),
			save: vi.fn(),
			remove: vi.fn(),
			replaceAll: replaceSubscriptions,
		},
		logger: {
			child: () => ({
				info: vi.fn(),
				warn: vi.fn(),
				error: vi.fn(),
				debug: vi.fn(),
			}),
		},
		adGate: { recordActionEvent },
		onReload: vi.fn().mockResolvedValue(undefined),
	}
	return {
		dependencies,
		recordActionEvent,
		replaceProfiles,
		replaceSubscriptions,
		addProfile: (next: ConnectionProfile) => {
			profiles = [...profiles, next]
		},
		editProfile: (id: string, next: ConnectionProfile) => {
			profiles = profiles.map((candidate) =>
				candidate.id === id ? next : candidate,
			)
		},
		lockSubscription: (id: string) => {
			subscriptions = subscriptions.map((subscription) =>
				subscription.id === id ? { ...subscription, locked: true } : subscription,
			)
		},
	}
}

describe('useConnectionCleanup', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		scan.mockResolvedValue({
			checkedProfileCount: 2,
			checkedSubscriptionCount: 2,
			keptProfileCount: 1,
			keptSubscriptionCount: 1,
			removeProfileIds: new Set(['remove']),
			removeSubscriptionIds: new Set(['remove-source']),
			lockedFailedSubscriptionCount: 0,
			lockedFailedProfileCount: 0,
			skippedLockedCount: 0,
		})
	})

	it('does not remove anything until the reviewed result is confirmed', async () => {
		const setupResult = setup()
		const { result } = renderHook(() =>
			useConnectionCleanup(setupResult.dependencies as never),
		)

		act(() => result.current.actions.openDrawer())
		await act(() => result.current.actions.startScan())
		expect(result.current.state.phase).toBe('review')
		expect(setupResult.replaceProfiles).not.toHaveBeenCalled()

		act(() => result.current.actions.setConfirmed(true))
		await act(() => result.current.actions.confirmCleanup())

		expect(setupResult.replaceProfiles).toHaveBeenCalledWith([
			expect.objectContaining({ id: 'keep' }),
		])
		expect(setupResult.replaceSubscriptions).toHaveBeenCalledWith([
			expect.objectContaining({ id: 'keep-source' }),
		])
		expect(result.current.state.phase).toBe('complete')
		expect(setupResult.recordActionEvent).toHaveBeenCalledOnce()
		expect(setupResult.recordActionEvent).toHaveBeenCalledWith({
			id: expect.any(String),
			action: 'cleanup',
			outcome: 'completed',
		})
	})

	it('scans and commits only the selected subscription aggregate', async () => {
		const setupResult = setup()
		const owned = profile('owned', 'remove-source')
		setupResult.addProfile(owned)
		setupResult.dependencies.profiles = [
			...setupResult.dependencies.profiles,
			owned,
		]
		scan.mockResolvedValueOnce({
			checkedProfileCount: 1,
			checkedSubscriptionCount: 1,
			keptProfileCount: 0,
			keptSubscriptionCount: 0,
			removeProfileIds: new Set(['owned']),
			removeSubscriptionIds: new Set(['remove-source']),
			lockedFailedSubscriptionCount: 0,
			lockedFailedProfileCount: 0,
			skippedLockedCount: 0,
		})
		const { result } = renderHook(() =>
			useConnectionCleanup(setupResult.dependencies as never),
		)

		act(() =>
			result.current.actions.openDrawer({
				kind: 'subscription',
				subscriptionId: 'remove-source',
			}),
		)
		await act(() => result.current.actions.startScan())

		expect(scan).toHaveBeenCalledWith(
			expect.objectContaining({
				profiles: [owned],
				subscriptions: [expect.objectContaining({ id: 'remove-source' })],
			}),
		)
		act(() => result.current.actions.setConfirmed(true))
		await act(() => result.current.actions.confirmCleanup())

		expect(setupResult.replaceProfiles).toHaveBeenCalledWith([
			expect.objectContaining({ id: 'keep' }),
			expect.objectContaining({ id: 'remove' }),
		])
		expect(setupResult.replaceSubscriptions).toHaveBeenCalledWith([
			expect.objectContaining({ id: 'keep-source' }),
		])
	})

	it('keeps the drawer open during a check until the job is canceled', async () => {
		scan.mockImplementationOnce(
			({ signal }: { signal: AbortSignal }) =>
				new Promise((_resolve, reject) => {
					signal.addEventListener(
						'abort',
						() => reject(new DOMException('Operation canceled', 'AbortError')),
						{ once: true },
					)
				}),
		)
		const setupResult = setup()
		const { result } = renderHook(() =>
			useConnectionCleanup(setupResult.dependencies as never),
		)

		act(() => result.current.actions.openDrawer())
		act(() => void result.current.actions.startScan())
		expect(result.current.state.phase).toBe('scanning')

		act(() => result.current.actions.closeDrawer())
		expect(result.current.state.open).toBe(true)

		act(() => result.current.actions.cancelScan())
		await waitFor(() => expect(result.current.state.phase).toBe('canceled'))
		act(() => result.current.actions.closeDrawer())
		expect(result.current.state.open).toBe(false)
	})

	it('refuses a stale cleanup result when the library changes', async () => {
		const setupResult = setup()
		const { result } = renderHook(() =>
			useConnectionCleanup(setupResult.dependencies as never),
		)

		act(() => result.current.actions.openDrawer())
		await act(() => result.current.actions.startScan())
		setupResult.addProfile(profile('added-after-scan'))
		act(() => result.current.actions.setConfirmed(true))
		await act(() => result.current.actions.confirmCleanup())

		await waitFor(() => expect(result.current.state.phase).toBe('error'))
		expect(setupResult.replaceProfiles).not.toHaveBeenCalled()
		expect(setupResult.replaceSubscriptions).not.toHaveBeenCalled()
	})

	it('refuses a stale cleanup result when an item changes under the same id', async () => {
		const setupResult = setup()
		const { result } = renderHook(() =>
			useConnectionCleanup(setupResult.dependencies as never),
		)

		act(() => result.current.actions.openDrawer())
		await act(() => result.current.actions.startScan())
		setupResult.editProfile('remove', {
			...profile('remove'),
			endpoint: { host: 'edited.example', port: 443 },
		})
		act(() => result.current.actions.setConfirmed(true))
		await act(() => result.current.actions.confirmCleanup())

		expect(result.current.state.phase).toBe('error')
		expect(result.current.state.error).toBe('changed')
		expect(setupResult.replaceProfiles).not.toHaveBeenCalled()
	})

	it('revalidates locks at commit and skips a newly locked aggregate', async () => {
		const setupResult = setup()
		const ownedProfile = profile('remove', 'remove-source')
		setupResult.editProfile('remove', ownedProfile)
		setupResult.dependencies.profiles = [profile('keep'), ownedProfile]
		const { result } = renderHook(() =>
			useConnectionCleanup(setupResult.dependencies as never),
		)

		act(() => result.current.actions.openDrawer())
		await act(() => result.current.actions.startScan())
		setupResult.lockSubscription('remove-source')
		act(() => result.current.actions.setConfirmed(true))
		await act(() => result.current.actions.confirmCleanup())

		expect(result.current.state.phase).toBe('complete')
		expect(setupResult.replaceProfiles).toHaveBeenCalledWith([
			expect.objectContaining({ id: 'keep' }),
			expect.objectContaining({ id: 'remove' }),
		])
		expect(setupResult.replaceSubscriptions).toHaveBeenCalledWith([
			expect.objectContaining({ id: 'keep-source' }),
			expect.objectContaining({ id: 'remove-source', locked: true }),
		])
		expect(result.current.state.report).toMatchObject({
			lockedFailedSubscriptionCount: 1,
			lockedFailedProfileCount: 1,
			skippedLockedCount: 2,
		})
	})

	it('restores the snapshots when the destructive commit fails', async () => {
		const setupResult = setup()
		setupResult.replaceSubscriptions.mockRejectedValueOnce(
			new Error('subscription write failed'),
		)
		const { result } = renderHook(() =>
			useConnectionCleanup(setupResult.dependencies as never),
		)

		act(() => result.current.actions.openDrawer())
		await act(() => result.current.actions.startScan())
		act(() => result.current.actions.setConfirmed(true))
		await act(() => result.current.actions.confirmCleanup())

		expect(result.current.state.phase).toBe('error')
		expect(setupResult.replaceProfiles).toHaveBeenLastCalledWith([
			expect.objectContaining({ id: 'keep' }),
			expect.objectContaining({ id: 'remove' }),
		])
		expect(setupResult.replaceSubscriptions).toHaveBeenLastCalledWith([
			expect.objectContaining({ id: 'keep-source' }),
			expect.objectContaining({ id: 'remove-source' }),
		])
		expect(result.current.state.error).toBe('commit-restored')
		expect(setupResult.recordActionEvent).not.toHaveBeenCalled()
	})

	it('reports when rollback cannot fully restore a partial commit', async () => {
		const setupResult = setup()
		setupResult.replaceProfiles
			.mockResolvedValueOnce(undefined)
			.mockRejectedValueOnce(new Error('profile rollback failed'))
		setupResult.replaceSubscriptions.mockRejectedValueOnce(
			new Error('subscription write failed'),
		)
		const { result } = renderHook(() =>
			useConnectionCleanup(setupResult.dependencies as never),
		)

		act(() => result.current.actions.openDrawer())
		await act(() => result.current.actions.startScan())
		act(() => result.current.actions.setConfirmed(true))
		await act(() => result.current.actions.confirmCleanup())

		expect(result.current.state.phase).toBe('error')
		expect(result.current.state.error).toBe('commit-partial')
	})
})
