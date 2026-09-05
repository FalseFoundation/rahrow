import { createLogBuffer } from '@rahrow/core/logging/log-buffer.ts'
import { silentLogger } from '@rahrow/core/logging/silent-logger.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { defaultProtocolRegistry } from '@rahrow/core/protocol/connection-protocol.ts'
import {
	JsonProfileStore,
	MemoryDocumentStore,
} from '@rahrow/core/storage/json-store.ts'
import type { Subscription } from '@rahrow/core/subscription/subscription-import.ts'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { createElement, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'

import type { AppRuntime } from '../app/runtime.tsx'

const runtimeRef = vi.hoisted(() => ({ current: null as AppRuntime | null }))

vi.mock('../app/runtime.tsx', () => ({
	useAppRuntime: () => runtimeRef.current,
}))

import { useSubscriptions } from './useSubscriptions.ts'

const existing: Subscription = {
	id: 'example-com-main',
	url: 'https://example.com/main.txt',
	name: 'Example',
}

function createSubscriptionStore(initial: readonly Subscription[] = []) {
	let subscriptions = [...initial]
	return {
		list: vi.fn(async () => subscriptions),
		save: vi.fn(async (subscription: Subscription) => {
			subscriptions = [
				...subscriptions.filter((candidate) => candidate.id !== subscription.id),
				subscription,
			]
		}),
		remove: vi.fn(async (id: string) => {
			subscriptions = subscriptions.filter((candidate) => candidate.id !== id)
		}),
	}
}

function createRuntime(
	subscriptionStore: ReturnType<typeof createSubscriptionStore>,
	profileStore = new JsonProfileStore(new MemoryDocumentStore()),
): AppRuntime {
	return {
		subscriptionStore,
		profileStore,
		registry: defaultProtocolRegistry,
		subscriptionFetcher: {
			async fetch() {
				return ''
			},
		},
		logger: silentLogger,
		logs: createLogBuffer(),
	} as unknown as AppRuntime
}

function renderSubscriptions(runtime: AppRuntime) {
	runtimeRef.current = runtime
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	})
	return renderHook(() => useSubscriptions(), {
		wrapper: ({ children }: { children: ReactNode }) =>
			createElement(QueryClientProvider, { client: queryClient, children }),
	})
}

describe('useSubscriptions', () => {
	it('publishes imported profiles before URL import resolves', async () => {
		const store = createSubscriptionStore()
		let releaseFetch: ((value: string) => void) | undefined
		const fetch = vi.fn(
			() =>
				new Promise<string>((resolve) => {
					releaseFetch = resolve
				}),
		)
		const profileStore = new JsonProfileStore(new MemoryDocumentStore())
		const runtime = {
			...createRuntime(store, profileStore),
			subscriptionFetcher: { fetch },
		}
		const { result } = renderSubscriptions(runtime)
		await waitFor(() => expect(result.current.state.isInitialized).toBe(true))

		let addPromise!: Promise<void>
		act(() => {
			addPromise = result.current.actions.addFromUrl(
				'https://example.com/imported.txt',
			)
		})
		await waitFor(() => expect(fetch).toHaveBeenCalledOnce())
		await expect(profileStore.list()).resolves.toEqual([])

		releaseFetch?.('trojan://secret@imported.example:443?security=tls#Imported')
		await act(async () => addPromise)

		await expect(profileStore.list()).resolves.toMatchObject([
			{
				protocol: 'trojan',
				endpoint: { host: 'imported.example', port: 443 },
				metadata: {
					name: 'Imported',
					source: 'subscription',
					subscriptionId: 'example-com',
				},
			},
		])
	})

	it('rejects URL import when refresh fails so the caller can preserve input', async () => {
		const store = createSubscriptionStore()
		const profileStore = new JsonProfileStore(new MemoryDocumentStore())
		const runtime = {
			...createRuntime(store, profileStore),
			subscriptionFetcher: {
				fetch: vi.fn(async () => {
					throw new Error('source unavailable')
				}),
			},
		}
		const { result } = renderSubscriptions(runtime)
		await waitFor(() => expect(result.current.state.isInitialized).toBe(true))

		await act(async () => {
			await expect(
				result.current.actions.addFromUrl('https://example.com/unavailable.txt'),
			).rejects.toThrow('source unavailable')
		})

		expect(await store.list()).toEqual([])
		await expect(profileStore.list()).resolves.toEqual([])
		expect(result.current.state.failure).toMatchObject({ operation: 'refresh' })
	})

	it('paces refresh-all and publishes the subscription cache once at the end', async () => {
		const subscriptions: Subscription[] = Array.from(
			{ length: 5 },
			(_, index) => ({
				id: `source-${index}`,
				url: `https://example.com/${index}.txt`,
			}),
		)
		const store = createSubscriptionStore(subscriptions)
		const fetch = vi.fn(async () => '')
		const runtime = { ...createRuntime(store), subscriptionFetcher: { fetch } }
		const { result } = renderSubscriptions(runtime)
		await waitFor(() =>
			expect(result.current.state.subscriptions).toHaveLength(5),
		)

		await act(async () => result.current.actions.refreshAll(subscriptions))

		expect(fetch).toHaveBeenCalledTimes(5)
		expect(store.save).toHaveBeenCalledTimes(5)
		// Each source is re-read before fetching and immediately before replacement so
		// a lock or ownership change cannot race the destructive refresh commit.
		expect(store.list).toHaveBeenCalledTimes(12)
	})

	it('exposes refresh-all pending progress and cancels queued sources', async () => {
		const subscriptions: Subscription[] = Array.from(
			{ length: 5 },
			(_, index) => ({
				id: `source-${index}`,
				url: `https://example.com/${index}.txt`,
			}),
		)
		const store = createSubscriptionStore(subscriptions)
		const started: string[] = []
		let release: (() => void) | undefined
		const gate = new Promise<void>((resolve) => {
			release = resolve
		})
		const runtime = {
			...createRuntime(store),
			subscriptionFetcher: {
				fetch: vi.fn(async (subscription: Subscription) => {
					started.push(subscription.id)
					await gate
					return ''
				}),
			},
		}
		const { result } = renderSubscriptions(runtime)
		await waitFor(() =>
			expect(result.current.state.subscriptions).toHaveLength(5),
		)

		let refreshPromise!: Promise<void>
		act(() => {
			refreshPromise = result.current.actions.refreshAll(subscriptions)
		})
		await waitFor(() => expect(started).toHaveLength(2))
		expect(result.current.state.subscriptions).toEqual(subscriptions)
		expect(result.current.state.refreshQueueProgress).toMatchObject({
			completed: 0,
			pending: 5,
			status: 'pending',
		})

		act(() => result.current.actions.cancelRefreshAll())
		release?.()
		await act(async () => refreshPromise)

		expect(started).toEqual(['source-0', 'source-1'])
		expect(result.current.state.refreshQueueProgress?.status).toBe('canceled')
	})

	it('reports a safe initial failure, blocks writes, and recovers on retry', async () => {
		const store = createSubscriptionStore()
		store.list
			.mockRejectedValueOnce(new Error('sqlite: /private/subscriptions.json'))
			.mockResolvedValue([])
		const { result } = renderSubscriptions(createRuntime(store))

		await waitFor(() =>
			expect(result.current.state.initializationFailure).toBeTruthy(),
		)
		expect(result.current.state.isInitialized).toBe(false)
		expect(
			JSON.stringify(result.current.state.initializationFailure),
		).not.toContain('/private')

		act(() => result.current.actions.setUrl('https://example.com/new.txt'))
		await act(async () => result.current.actions.add())
		expect(store.save).not.toHaveBeenCalled()

		await act(async () => result.current.actions.retryInitialLoad())
		await waitFor(() => expect(result.current.state.isInitialized).toBe(true))
		expect(result.current.state.initializationFailure).toBeNull()
	})

	it('derives the identifier and requires explicit replacement for a duplicate URL', async () => {
		const store = createSubscriptionStore([existing])
		const { result } = renderSubscriptions(createRuntime(store))
		await waitFor(() =>
			expect(result.current.state.subscriptions).toHaveLength(1),
		)

		act(() => {
			result.current.actions.setUrl(existing.url)
			result.current.actions.setName('Replacement')
		})
		await act(async () => result.current.actions.add())

		expect(store.save).not.toHaveBeenCalled()
		expect(result.current.state.duplicate).toEqual(existing)

		await act(async () => result.current.actions.confirmReplace())
		expect(store.save).toHaveBeenCalledWith({
			id: existing.id,
			url: existing.url,
			name: 'Replacement',
		})
		expect(result.current.state.url).toBe('')
		expect(result.current.state.name).toBe('')
	})

	it('locks duplicate add activations while persistence is pending', async () => {
		let release: () => void = () => {}
		const pending = new Promise<void>((resolve) => {
			release = resolve
		})
		const store = createSubscriptionStore()
		store.save.mockImplementation(async () => pending)
		const { result } = renderSubscriptions(createRuntime(store))
		await waitFor(() => expect(result.current.state.isLoading).toBe(false))
		act(() => result.current.actions.setUrl('https://example.com/new.txt'))

		let first!: Promise<void>
		let second!: Promise<void>
		act(() => {
			first = result.current.actions.add()
			second = result.current.actions.add()
		})
		await waitFor(() => expect(store.save).toHaveBeenCalledOnce())
		release()
		await act(async () => Promise.all([first, second]))
	})

	it('skips refresh replacement when the source becomes locked during fetch', async () => {
		const store = createSubscriptionStore([existing])
		const profileStore = new JsonProfileStore(new MemoryDocumentStore())
		const ownedProfile: ConnectionProfile = {
			id: 'owned-before-lock',
			protocol: 'vless',
			endpoint: { host: 'before.example', port: 443 },
			metadata: { source: 'subscription', subscriptionId: existing.id },
		}
		await profileStore.save(ownedProfile)
		const runtime = {
			...createRuntime(store, profileStore),
			subscriptionFetcher: {
				fetch: vi.fn(async () => {
					await store.save({ ...existing, locked: true })
					return 'trojan://secret@after.example:443?security=tls#After'
				}),
			},
		}
		const { result } = renderSubscriptions(runtime)
		await waitFor(() =>
			expect(result.current.state.subscriptions).toHaveLength(1),
		)

		await act(async () => result.current.actions.refresh(existing))

		expect(await profileStore.list()).toEqual([ownedProfile])
		expect(store.list).toHaveBeenCalledTimes(3)
	})

	it('confirms owned-profile consequences and restores data when removal fails', async () => {
		const store = createSubscriptionStore([existing])
		store.remove.mockRejectedValueOnce(new Error('disk unavailable'))
		const profileStore = new JsonProfileStore(new MemoryDocumentStore())
		const ownedProfile: ConnectionProfile = {
			id: 'owned',
			protocol: 'vless',
			endpoint: { host: 'example.com', port: 443 },
			authentication: { id: '11111111-1111-4111-8111-111111111111' },
			metadata: { source: 'subscription', subscriptionId: existing.id },
		}
		await profileStore.save(ownedProfile)
		const { result } = renderSubscriptions(createRuntime(store, profileStore))
		await waitFor(() =>
			expect(result.current.state.subscriptions).toHaveLength(1),
		)

		await act(async () => result.current.actions.requestRemove(existing))
		expect(result.current.state.removalCandidate).toEqual({
			subscription: existing,
			ownedProfileCount: 1,
		})

		await act(async () => result.current.actions.confirmRemove())
		expect(result.current.state.subscriptions).toEqual([existing])
		await expect(profileStore.list()).resolves.toEqual([ownedProfile])
		expect(result.current.state.failure).toEqual({
			operation: 'remove',
			subscriptionId: existing.id,
			message: 'Could not remove this source. Try again.',
		})
	})
})
