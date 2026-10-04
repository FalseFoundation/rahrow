import {
	removeSubscriptionProfiles,
	replaceSubscriptionProfiles,
} from '@rahrow/core/profile/profile-workflow.ts'
import { parseSecureSubscriptionUrl } from '@rahrow/core/subscription/subscription-fetch-policy.ts'
import type { Subscription } from '@rahrow/core/subscription/subscription-import.ts'
import { refreshSubscription } from '@rahrow/core/subscription/subscription-import.ts'
import { toast } from '@rahrow/ui/components/ui/sonner.tsx'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAppTranslation } from '../app/app-i18n.tsx'
import { useAppRuntime } from '../app/runtime.tsx'
import {
	countSubscriptionProfilesPaced,
	createPacedProfileCollectionScheduler,
} from '../profiles/connection-work-pacing.ts'
import { parseSubscriptionProfilesPaced } from './paced-subscription-parser.ts'
import {
	deriveSubscriptionId,
	normalizeSubscriptionUrl,
} from './subscription-actions-model.ts'
import { subscriptionsNeedingRefresh } from './subscription-hygiene.ts'
import {
	runSubscriptionRefreshQueue,
	type SubscriptionRefreshQueueProgress,
} from './subscription-refresh-queue.ts'

export interface SubscriptionActionFailure {
	readonly operation: 'add' | 'refresh' | 'remove'
	readonly message: string
	readonly subscriptionId?: string
}

export interface SubscriptionRemovalCandidate {
	readonly subscription: Subscription
	readonly ownedProfileCount: number
}

interface RefreshOptions {
	readonly publish?: boolean
	readonly notify?: boolean
	readonly rethrow?: boolean
	readonly signal?: AbortSignal
}

export function useSubscriptions() {
	const { t } = useAppTranslation()
	const runtime = useAppRuntime()
	const logger = useMemo(
		() => runtime.logger.child({ module: 'user-action' }),
		[runtime.logger],
	)
	const queryClient = useQueryClient()
	const queryKey = useMemo(
		() => ['subscriptions', runtime.subscriptionStore] as const,
		[runtime.subscriptionStore],
	)
	const subscriptionQuery = useQuery({
		queryKey,
		queryFn: () => runtime.subscriptionStore.list(),
	})
	const initialized = subscriptionQuery.isSuccess
	const initializedRef = useRef(initialized)
	initializedRef.current = initialized
	const [url, setUrl] = useState('')
	const [name, setName] = useState('')
	const [message, setMessage] = useState(() => t('common.ready'))
	const [failure, setFailure] = useState<SubscriptionActionFailure | null>(null)
	const [duplicate, setDuplicate] = useState<Subscription | null>(null)
	const [removalCandidate, setRemovalCandidate] =
		useState<SubscriptionRemovalCandidate | null>(null)
	const [addPending, setAddPending] = useState(false)
	const [refreshingIds, setRefreshingIds] = useState<ReadonlySet<string>>(
		new Set(),
	)
	const [removingIds, setRemovingIds] = useState<ReadonlySet<string>>(new Set())
	const [refreshQueueProgress, setRefreshQueueProgress] =
		useState<SubscriptionRefreshQueueProgress | null>(null)
	const addInFlight = useRef(false)
	const refreshInFlight = useRef(new Set<string>())
	const refreshControllers = useRef(new Map<string, AbortController>())
	const refreshAllController = useRef<AbortController | null>(null)
	const removeInFlight = useRef(new Set<string>())
	const autoRefreshStarted = useRef(false)

	useEffect(
		() => () => {
			refreshAllController.current?.abort()
			refreshAllController.current = null
			for (const controller of refreshControllers.current.values())
				controller.abort()
			refreshControllers.current.clear()
		},
		[],
	)

	const reload = useCallback(async () => {
		const subscriptions = await runtime.subscriptionStore.list()
		queryClient.setQueryData(queryKey, subscriptions)
		return subscriptions
	}, [queryClient, queryKey, runtime.subscriptionStore])

	const refreshOne = useCallback(
		async (
			subscription: Subscription,
			{
				publish = true,
				notify = true,
				rethrow = false,
				signal,
			}: RefreshOptions = {},
		) => {
			if (refreshInFlight.current.has(subscription.id)) return
			refreshInFlight.current.add(subscription.id)
			const controller = new AbortController()
			const abortFromQueue = () => controller.abort()
			if (signal?.aborted) controller.abort()
			else signal?.addEventListener('abort', abortFromQueue, { once: true })
			refreshControllers.current.set(subscription.id, controller)
			setRefreshingIds((current) => new Set(current).add(subscription.id))
			try {
				if (notify) setFailure(null)
				const currentSubscription = (await runtime.subscriptionStore.list()).find(
					(candidate) => candidate.id === subscription.id,
				)
				if (!currentSubscription || currentSubscription.locked) {
					if (notify) {
						toast.error(t('subscriptions.errors.locked'), {
							description: t('subscriptions.errors.unlockEdit'),
						})
					}
					return
				}
				const result = await refreshSubscription(
					currentSubscription,
					runtime.subscriptionFetcher,
					undefined,
					runtime.registry,
					{
						parse: (input, registry) =>
							parseSubscriptionProfilesPaced(input, registry, {
								signal: controller.signal,
							}),
					},
				)
				const latestSubscription = (await runtime.subscriptionStore.list()).find(
					(candidate) => candidate.id === subscription.id,
				)
				if (
					!latestSubscription ||
					latestSubscription.locked ||
					latestSubscription.url !== currentSubscription.url ||
					latestSubscription.name !== currentSubscription.name
				) {
					if (notify) {
						toast.error(t('subscriptions.errors.locked'), {
							description: t('subscriptions.errors.unlockEdit'),
						})
					}
					return
				}
				const profilesBeforeRefresh = await runtime.profileStore.list()
				await replaceSubscriptionProfiles(
					runtime.profileStore,
					subscription.id,
					result.profiles,
					createPacedProfileCollectionScheduler(controller.signal),
				)

				try {
					await runtime.subscriptionStore.save(result.subscription)
				} catch (caught) {
					await runtime.profileStore
						.replaceAll?.(profilesBeforeRefresh)
						.catch(() => undefined)
					throw caught
				}
				if (publish) await reload()
				logger.info(
					{
						action: 'subscription.import',
						outcome: 'success',
						profileCount: result.profiles.length,
						skippedCount: result.issues.length,
					},
					`Imported ${result.profiles.length} profile${result.profiles.length === 1 ? '' : 's'} from subscription`,
				)
				if (notify) {
					setMessage(
						t('subscriptions.feedback.imported', {
							count: result.profiles.length,
							skipped: result.issues.length,
						}),
					)
					toast.success(t('subscriptions.feedback.refreshed'), {
						description: t('subscriptions.feedback.profilesReady', {
							count: result.profiles.length,
						}),
					})
				}
			} catch (error) {
				if (error instanceof DOMException && error.name === 'AbortError') {
					if (!notify || rethrow) throw error
					return
				}
				logger.warn(
					{
						action: 'subscription.import',
						outcome: 'failure',
						errorType: error instanceof Error ? error.name : typeof error,
					},
					'Subscription import failed',
				)
				if (!notify) throw error
				setMessage(t('subscriptions.errors.refresh'))
				setFailure({
					operation: 'refresh',
					subscriptionId: subscription.id,
					message: t('subscriptions.errors.refreshSource'),
				})
				toast.error(t('subscriptions.errors.refresh'), {
					description: t('subscriptions.errors.tryMoment'),
				})
				if (rethrow) throw error
			} finally {
				signal?.removeEventListener('abort', abortFromQueue)
				refreshInFlight.current.delete(subscription.id)
				if (refreshControllers.current.get(subscription.id) === controller) {
					refreshControllers.current.delete(subscription.id)
				}
				setRefreshingIds((current) => {
					const next = new Set(current)
					next.delete(subscription.id)
					return next
				})
			}
		},
		[logger, reload, runtime],
	)
	const refresh = useCallback(
		(subscription: Subscription) => refreshOne(subscription),
		[refreshOne],
	)
	const refreshAll = useCallback(
		async (subscriptions: readonly Subscription[]) => {
			if (subscriptions.length === 0) return
			refreshAllController.current?.abort()
			const controller = new AbortController()
			refreshAllController.current = controller
			try {
				await runSubscriptionRefreshQueue(
					subscriptions,
					(subscription, { signal }) =>
						refreshOne(subscription, {
							publish: false,
							notify: false,
							rethrow: true,
							signal,
						}),
					{
						signal: controller.signal,
						onProgress: setRefreshQueueProgress,
					},
				)
			} catch (error) {
				if (!(error instanceof DOMException && error.name === 'AbortError')) {
					throw error
				}
			} finally {
				await reload()
				if (refreshAllController.current === controller) {
					refreshAllController.current = null
				}
			}
		},
		[refreshOne, reload],
	)
	const cancelRefreshAll = useCallback(() => {
		refreshAllController.current?.abort()
	}, [])

	useEffect(() => {
		if (!initialized || autoRefreshStarted.current) return
		const stale = subscriptionsNeedingRefresh(subscriptionQuery.data ?? [])
		if (stale.length === 0) return
		autoRefreshStarted.current = true
		void refreshAll(stale).catch((error) => {
			logger.warn(
				{
					action: 'subscription.auto-refresh',
					outcome: 'failure',
					errorType: error instanceof Error ? error.name : typeof error,
				},
				'Background subscription refresh failed',
			)
		})
	}, [initialized, logger, refreshAll, subscriptionQuery.data])

	const saveDraft = useCallback(
		async (replacement?: Subscription) => {
			if (!initializedRef.current) return
			if (addInFlight.current) return
			addInFlight.current = true
			setAddPending(true)
			setFailure(null)
			try {
				if (!url.trim()) throw new Error(t('subscriptions.errors.urlRequired'))
				parseSecureSubscriptionUrl(url)
				const normalizedUrl = normalizeSubscriptionUrl(url)
				const subscriptions = await runtime.subscriptionStore.list()
				const duplicateSource = subscriptions.find((candidate) => {
					try {
						return normalizeSubscriptionUrl(candidate.url) === normalizedUrl
					} catch {
						return candidate.url.trim() === url.trim()
					}
				})
				if (duplicateSource && replacement?.id !== duplicateSource.id) {
					setDuplicate(duplicateSource)
					setMessage(t('subscriptions.errors.duplicate'))
					return
				}

				const nextId =
					replacement?.id ??
					deriveSubscriptionId({
						name,
						url: normalizedUrl,
						existingIds: subscriptions.map(({ id }) => id),
					})
				await runtime.subscriptionStore.save({
					...replacement,
					id: nextId,
					url: normalizedUrl,
					...(name.trim()
						? { name: name.trim() }
						: replacement?.name
							? { name: replacement.name }
							: {}),
				})
				await reload()
				setUrl('')
				setName('')
				setDuplicate(null)
				setMessage(
					replacement
						? t('subscriptions.feedback.replaced')
						: t('subscriptions.feedback.saved'),
				)
				toast.success(
					replacement
						? t('subscriptions.feedback.replaced')
						: t('subscriptions.feedback.saved'),
				)
			} catch {
				const nextMessage = t('subscriptions.errors.save')
				setMessage(nextMessage)
				setFailure({
					operation: 'add',
					message: t('subscriptions.errors.saveRecovery'),
				})
			} finally {
				addInFlight.current = false
				setAddPending(false)
			}
		},
		[name, reload, runtime.subscriptionStore, t, url],
	)

	const add = useCallback(() => saveDraft(), [saveDraft])
	const confirmReplace = useCallback(
		() => (duplicate ? saveDraft(duplicate) : Promise.resolve()),
		[duplicate, saveDraft],
	)
	const cancelReplace = useCallback(() => setDuplicate(null), [])

	const addFromUrl = useCallback(
		async (value: string) => {
			if (!initializedRef.current) {
				throw new Error(t('subscriptions.errors.notReady'))
			}
			const normalizedUrl = value.trim()
			if (!normalizedUrl) {
				setMessage(t('subscriptions.errors.urlRequired'))
				throw new Error(t('subscriptions.errors.urlRequired'))
			}
			try {
				parseSecureSubscriptionUrl(normalizedUrl)
			} catch (error) {
				const message = t('subscriptions.errors.invalidUrl')
				setMessage(message)
				throw new Error(message, { cause: error })
			}
			const hostname = (() => {
				try {
					return new URL(normalizedUrl).hostname || 'subscription'
				} catch {
					return 'subscription'
				}
			})()
			const subscriptions = await runtime.subscriptionStore.list()
			const nextId = deriveSubscriptionId({
				name: hostname,
				url: normalizedUrl,
				existingIds: subscriptions.map(({ id }) => id),
			})
			const subscription: Subscription = {
				id: nextId,
				url: normalizedUrl,
				name: hostname,
			}
			await runtime.subscriptionStore.save(subscription)
			await reload()
			setMessage(t('subscriptions.feedback.savedRefreshing'))
			try {
				await refreshOne(subscription, { rethrow: true })
			} catch (error) {
				await runtime.subscriptionStore
					.remove(subscription.id)
					.catch(() => undefined)
				await reload().catch(() => undefined)
				throw error
			}
		},
		[refreshOne, reload, runtime, t],
	)

	const remove = useCallback(
		async (subscriptionId: string) => {
			if (!initializedRef.current) return
			if (removeInFlight.current.has(subscriptionId)) return
			removeInFlight.current.add(subscriptionId)
			setRemovingIds((current) => new Set(current).add(subscriptionId))
			setFailure(null)
			let profilesBeforeRemoval: Awaited<
				ReturnType<typeof runtime.profileStore.list>
			> | null = null
			let profilesChanged = false
			try {
				const existing = (await runtime.subscriptionStore.list()).find(
					(candidate) => candidate.id === subscriptionId,
				)
				if (existing?.locked) {
					toast.error(t('subscriptions.errors.locked'), {
						description: t('subscriptions.errors.unlockRemove'),
					})
					return
				}
				profilesBeforeRemoval = await runtime.profileStore.list()
				const beforeProfileCommit = (await runtime.subscriptionStore.list()).find(
					(candidate) => candidate.id === subscriptionId,
				)
				if (!beforeProfileCommit || beforeProfileCommit.locked) {
					toast.error(t('subscriptions.errors.locked'), {
						description: t('subscriptions.errors.unlockRemove'),
					})
					return
				}
				await removeSubscriptionProfiles(
					runtime.profileStore,
					subscriptionId,
					createPacedProfileCollectionScheduler(),
				)
				profilesChanged = true
				const beforeSourceCommit = (await runtime.subscriptionStore.list()).find(
					(candidate) => candidate.id === subscriptionId,
				)
				if (!beforeSourceCommit || beforeSourceCommit.locked) {
					await runtime.profileStore.replaceAll?.(profilesBeforeRemoval)
					profilesChanged = false
					toast.error(t('subscriptions.errors.locked'), {
						description: t('subscriptions.errors.unlockRemove'),
					})
					return
				}
				await runtime.subscriptionStore.remove(subscriptionId)
				await reload()
				setMessage(t('subscriptions.feedback.removed'))
				toast.success(t('subscriptions.feedback.removed'))
			} catch {
				if (
					profilesChanged &&
					profilesBeforeRemoval &&
					runtime.profileStore.replaceAll
				) {
					await runtime.profileStore
						.replaceAll(profilesBeforeRemoval)
						.catch(() => undefined)
				}
				setMessage(t('subscriptions.errors.remove'))
				setFailure({
					operation: 'remove',
					subscriptionId,
					message: t('subscriptions.errors.removeRecovery'),
				})
				toast.error(t('subscriptions.errors.removeFailed'), {
					description: t('subscriptions.errors.sourceKept'),
				})
			} finally {
				removeInFlight.current.delete(subscriptionId)
				setRemovingIds((current) => {
					const next = new Set(current)
					next.delete(subscriptionId)
					return next
				})
			}
		},
		[reload, runtime, t],
	)

	const requestRemove = useCallback(
		async (subscription: Subscription) => {
			const profiles = await runtime.profileStore.list()
			setRemovalCandidate({
				subscription,
				ownedProfileCount: await countSubscriptionProfilesPaced(
					profiles,
					subscription.id,
				),
			})
		},
		[runtime.profileStore],
	)
	const confirmRemove = useCallback(async () => {
		const candidate = removalCandidate
		if (!candidate) return
		setRemovalCandidate(null)
		await remove(candidate.subscription.id)
	}, [removalCandidate, remove])
	const cancelRemove = useCallback(() => setRemovalCandidate(null), [])

	const update = useCallback(
		async (subscription: Subscription) => {
			if (!initializedRef.current) return
			try {
				parseSecureSubscriptionUrl(subscription.url)
				const existing = (await runtime.subscriptionStore.list()).find(
					(candidate) => candidate.id === subscription.id,
				)
				if (
					existing?.locked &&
					subscription.locked &&
					(existing.url !== subscription.url || existing.name !== subscription.name)
				) {
					throw new Error(t('subscriptions.errors.unlockEdit'))
				}
				await runtime.subscriptionStore.save(subscription)
				await reload()
				setMessage(t('subscriptions.feedback.updated'))
				toast.success(t('subscriptions.feedback.updated'))
			} catch (error) {
				setMessage(t('subscriptions.errors.update'))
				toast.error(t('subscriptions.errors.update'), {
					description: t('subscriptions.errors.checkUrl'),
				})
				throw error
			}
		},
		[reload, runtime, t],
	)

	return {
		state: {
			subscriptions: subscriptionQuery.data ?? [],
			url,
			name,
			message,
			failure,
			duplicate,
			removalCandidate,
			isLoading: subscriptionQuery.isPending,
			isInitialized: initialized,
			initializationFailure: subscriptionQuery.isError
				? {
						title: t('subscriptions.errors.loadTitle'),
						description: t('subscriptions.errors.loadDescription'),
						detail: t('subscriptions.errors.loadDetail'),
					}
				: null,
			addPending,
			refreshingIds,
			refreshQueueProgress,
			removingIds,
		},
		actions: {
			retryInitialLoad: () => subscriptionQuery.refetch(),
			reload,
			setUrl,
			setName,
			add,
			confirmReplace,
			cancelReplace,
			addFromUrl,
			refresh,
			refreshAll,
			cancelRefreshAll,
			requestRemove,
			confirmRemove,
			cancelRemove,
			remove,
			update,
		},
	}
}
