import {
	type AdGateController,
	createAdActionEventId,
} from '@rahrow/ads/ad-gate.ts'
import type { Logger } from '@rahrow/core/logging/logger.ts'
import {
	isProfileProtectedByLock,
	protectedSubscriptionIds,
} from '@rahrow/core/profile/connection-lock-policy.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type { ProxyEngine } from '@rahrow/core/runtime/proxy-engine.ts'
import type {
	ProfileStore,
	SettingsStore,
} from '@rahrow/core/storage/json-store.ts'
import type {
	Subscription,
	SubscriptionFetcher,
	SubscriptionStore,
} from '@rahrow/core/subscription/subscription-import.ts'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { recordAdAction } from '../ads/record-ad-action.ts'
import type { ConnectionCleanupReport } from './connection-cleanup-model.ts'
import {
	type ConnectionCleanupProgress,
	scanConnectionsForCleanup,
} from './connection-cleanup-work.ts'
import {
	createPacedProfileCollectionScheduler,
	haveSameRecordsPaced,
} from './connection-work-pacing.ts'

export type ConnectionCleanupPhase =
	| 'ready'
	| 'scanning'
	| 'review'
	| 'committing'
	| 'complete'
	| 'canceled'
	| 'error'

export type ConnectionCleanupError =
	| 'unavailable'
	| 'check'
	| 'changed'
	| 'commit-restored'
	| 'commit-partial'

export type ConnectionCleanupScope =
	| { readonly kind: 'all' }
	| { readonly kind: 'local' }
	| { readonly kind: 'subscription'; readonly subscriptionId: string }

function profilesInCleanupScope(
	profiles: readonly ConnectionProfile[],
	scope: ConnectionCleanupScope,
) {
	if (scope.kind === 'all') return profiles
	if (scope.kind === 'local') {
		return profiles.filter(
			(profile) => profile.metadata?.subscriptionId === undefined,
		)
	}
	return profiles.filter(
		(profile) => profile.metadata?.subscriptionId === scope.subscriptionId,
	)
}

function subscriptionsInCleanupScope(
	subscriptions: readonly Subscription[],
	scope: ConnectionCleanupScope,
) {
	if (scope.kind === 'all') return subscriptions
	if (scope.kind === 'local') return []
	return subscriptions.filter(({ id }) => id === scope.subscriptionId)
}

export function useConnectionCleanup({
	profiles,
	subscriptions,
	engine,
	subscriptionFetcher,
	profileStore,
	subscriptionStore,
	settingsStore,
	adGate,
	logger,
	onReload,
}: {
	readonly profiles: readonly ConnectionProfile[]
	readonly subscriptions: readonly Subscription[]
	readonly engine: ProxyEngine
	readonly subscriptionFetcher: SubscriptionFetcher
	readonly profileStore: ProfileStore
	readonly subscriptionStore: SubscriptionStore
	readonly settingsStore?: SettingsStore
	readonly adGate?: AdGateController
	readonly logger: Logger
	readonly onReload: () => Promise<void>
}) {
	const [open, setOpen] = useState(false)
	const [phase, setPhase] = useState<ConnectionCleanupPhase>('ready')
	const [progress, setProgress] = useState<ConnectionCleanupProgress>({
		completed: 0,
		total: 0,
		phase: 'profiles',
	})
	const [report, setReport] = useState<ConnectionCleanupReport | null>(null)
	const [confirmed, setConfirmed] = useState(false)
	const [error, setError] = useState<ConnectionCleanupError>()
	const [scope, setScope] = useState<ConnectionCleanupScope>({ kind: 'all' })
	const scopeRef = useRef<ConnectionCleanupScope>({ kind: 'all' })
	const controllerRef = useRef<AbortController | undefined>(undefined)
	const scannedProfilesRef = useRef<readonly ConnectionProfile[]>([])
	const scannedSubscriptionsRef = useRef<readonly Subscription[]>([])
	const actionLogger = useMemo(
		() => logger.child({ module: 'connection-cleanup' }),
		[logger],
	)
	const canCommitAtomically =
		profileStore.replaceAll !== undefined &&
		subscriptionStore.replaceAll !== undefined
	const dismissalLocked = phase === 'scanning' || phase === 'committing'

	const reset = useCallback(() => {
		controllerRef.current?.abort()
		controllerRef.current = undefined
		setPhase('ready')
		setProgress({ completed: 0, total: 0, phase: 'profiles' })
		setReport(null)
		setConfirmed(false)
		setError(undefined)
		scannedProfilesRef.current = []
		scannedSubscriptionsRef.current = []
	}, [])

	useEffect(() => () => controllerRef.current?.abort(), [])

	const openDrawer = useCallback(
		(nextScope: ConnectionCleanupScope = { kind: 'all' }) => {
			reset()
			scopeRef.current = nextScope
			setScope(nextScope)
			setOpen(true)
		},
		[reset],
	)

	const closeDrawer = useCallback(() => {
		if (dismissalLocked) return
		reset()
		setOpen(false)
	}, [dismissalLocked, reset])

	const startScan = useCallback(async () => {
		if (!canCommitAtomically) {
			setError('unavailable')
			setPhase('error')
			return
		}
		const controller = new AbortController()
		controllerRef.current?.abort()
		controllerRef.current = controller
		const allProfiles = [...profiles]
		const allSubscriptions = [...subscriptions]
		const scanProfiles = profilesInCleanupScope(allProfiles, scopeRef.current)
		const scanSubscriptions = subscriptionsInCleanupScope(
			allSubscriptions,
			scopeRef.current,
		)
		scannedProfilesRef.current = allProfiles
		scannedSubscriptionsRef.current = allSubscriptions
		setConfirmed(false)
		setReport(null)
		setError(undefined)
		setProgress({
			completed: 0,
			total: scanProfiles.length + scanSubscriptions.length,
			phase: 'profiles',
		})
		setPhase('scanning')
		try {
			const nextReport = await scanConnectionsForCleanup({
				profiles: scanProfiles,
				subscriptions: scanSubscriptions,
				engine,
				subscriptionFetcher,
				signal: controller.signal,
				onProgress: setProgress,
			})
			if (controller.signal.aborted) return
			setReport(nextReport)
			setPhase('review')
			actionLogger.info(
				{
					action: 'connections.cleanup.scan',
					outcome: 'success',
					profileCount: nextReport.checkedProfileCount,
					subscriptionCount: nextReport.checkedSubscriptionCount,
					removeProfileCount: nextReport.removeProfileIds.size,
					removeSubscriptionCount: nextReport.removeSubscriptionIds.size,
				},
				'Connection cleanup check completed',
			)
		} catch (caught) {
			if (caught instanceof DOMException && caught.name === 'AbortError') {
				setPhase('canceled')
				return
			}
			setError('check')
			setPhase('error')
		} finally {
			if (controllerRef.current === controller) controllerRef.current = undefined
		}
	}, [
		actionLogger,
		canCommitAtomically,
		engine,
		profiles,
		subscriptionFetcher,
		subscriptions,
	])

	const cancelScan = useCallback(() => controllerRef.current?.abort(), [])

	const confirmCleanup = useCallback(async () => {
		if (!confirmed || !report || !canCommitAtomically) return
		const eventId = createAdActionEventId('cleanup')
		setPhase('committing')
		let currentProfiles: readonly ConnectionProfile[]
		let currentSubscriptions: readonly Subscription[]
		let previousSettings: Awaited<ReturnType<SettingsStore['read']>> | undefined
		try {
			;[currentProfiles, currentSubscriptions, previousSettings] =
				await Promise.all([
					profileStore.list(),
					subscriptionStore.list(),
					settingsStore?.read(),
				])
		} catch {
			setError('check')
			setPhase('error')
			return
		}
		const scheduler = createPacedProfileCollectionScheduler()
		const subscriptionsWithoutLock = (items: readonly Subscription[]) =>
			items.map(({ locked: _locked, ...subscription }) => subscription)
		const [profilesUnchanged, subscriptionsUnchanged] = await Promise.all([
			haveSameRecordsPaced(scannedProfilesRef.current, currentProfiles),
			haveSameRecordsPaced(
				subscriptionsWithoutLock(scannedSubscriptionsRef.current),
				subscriptionsWithoutLock(currentSubscriptions),
			),
		])
		if (!profilesUnchanged || !subscriptionsUnchanged) {
			setConfirmed(false)
			setError('changed')
			setPhase('error')
			return
		}
		const lockedSubscriptionIds = protectedSubscriptionIds(currentSubscriptions)
		const removeSubscriptionIds = new Set(
			[...report.removeSubscriptionIds].filter(
				(id) => !lockedSubscriptionIds.has(id),
			),
		)
		const removeProfileIds = new Set(
			currentProfiles
				.filter(
					(profile) =>
						report.removeProfileIds.has(profile.id) &&
						!isProfileProtectedByLock(profile, lockedSubscriptionIds),
				)
				.map((profile) => profile.id),
		)
		const newlyLockedSubscriptionCount =
			report.removeSubscriptionIds.size - removeSubscriptionIds.size
		const newlyLockedProfileCount =
			report.removeProfileIds.size - removeProfileIds.size
		const committedReport: ConnectionCleanupReport = {
			...report,
			keptProfileCount: currentProfiles.length - removeProfileIds.size,
			keptSubscriptionCount:
				currentSubscriptions.length - removeSubscriptionIds.size,
			removeProfileIds,
			removeSubscriptionIds,
			lockedFailedSubscriptionCount:
				report.lockedFailedSubscriptionCount + newlyLockedSubscriptionCount,
			lockedFailedProfileCount:
				report.lockedFailedProfileCount + newlyLockedProfileCount,
			skippedLockedCount:
				report.skippedLockedCount +
				newlyLockedSubscriptionCount +
				newlyLockedProfileCount,
		}

		const [keptProfiles, keptSubscriptions] = await Promise.all([
			scheduler.process(currentProfiles, (batch) =>
				batch.filter((profile) => !removeProfileIds.has(profile.id)),
			),
			scheduler.process(currentSubscriptions, (batch) =>
				batch.filter((subscription) => !removeSubscriptionIds.has(subscription.id)),
			),
		])
		try {
			await profileStore.replaceAll?.(keptProfiles)
			await subscriptionStore.replaceAll?.(keptSubscriptions)
			if (
				settingsStore &&
				previousSettings?.activeProfileId &&
				removeProfileIds.has(previousSettings.activeProfileId)
			) {
				await settingsStore.write({
					...previousSettings,
					activeProfileId: undefined,
				})
			}
			await onReload()
			setReport(committedReport)
			setPhase('complete')
			await recordAdAction(adGate, actionLogger, {
				id: eventId,
				action: 'cleanup',
				outcome:
					removeProfileIds.size + removeSubscriptionIds.size > 0
						? 'completed'
						: 'no-op',
			})
			actionLogger.info(
				{
					action: 'connections.cleanup.commit',
					outcome: 'success',
					removedProfileCount: removeProfileIds.size,
					removedSubscriptionCount: removeSubscriptionIds.size,
					skippedLockedCount: committedReport.skippedLockedCount,
				},
				'Connection cleanup completed',
			)
		} catch (caught) {
			const rollbackResults = await Promise.allSettled([
				profileStore.replaceAll?.(currentProfiles) ?? Promise.resolve(),
				subscriptionStore.replaceAll?.(currentSubscriptions) ?? Promise.resolve(),
				previousSettings && settingsStore
					? settingsStore.write(previousSettings)
					: Promise.resolve(),
			])
			const recoveryFailed = rollbackResults.some(
				(result) => result.status === 'rejected',
			)
			setError(recoveryFailed ? 'commit-partial' : 'commit-restored')
			actionLogger.error(
				{
					action: 'connections.cleanup.commit',
					outcome: recoveryFailed ? 'recovery-failed' : 'restored',
					error: caught,
					rollbackErrors: rollbackResults.flatMap((result) =>
						result.status === 'rejected' ? [result.reason] : [],
					),
				},
				'Connection cleanup could not commit',
			)
			setPhase('error')
		}
	}, [
		actionLogger,
		adGate,
		canCommitAtomically,
		confirmed,
		onReload,
		profileStore,
		report,
		settingsStore,
		subscriptionStore,
	])

	return {
		state: {
			open,
			phase,
			progress,
			report,
			confirmed,
			error,
			canCommitAtomically,
			dismissalLocked,
			scope,
			scopeProfileCount: profilesInCleanupScope(profiles, scope).length,
			scopeSubscriptionCount: subscriptionsInCleanupScope(subscriptions, scope)
				.length,
		},
		actions: {
			openDrawer,
			closeDrawer,
			startScan,
			cancelScan,
			setConfirmed,
			confirmCleanup,
		},
	}
}
