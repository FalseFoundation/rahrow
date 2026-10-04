import {
	type AdAction,
	type AdGateController,
	createAdActionEventId,
} from '@rahrow/ads/ad-gate.ts'
import type { Logger } from '@rahrow/core/logging/logger.ts'
import {
	partitionProfilesByLock,
	protectedSubscriptionIds,
} from '@rahrow/core/profile/connection-lock-policy.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import {
	duplicateProfile,
	renameProfile,
} from '@rahrow/core/profile/profile-workflow.ts'
import type { ProtocolRegistry } from '@rahrow/core/protocol/connection-protocol.ts'
import type {
	LatencyResult,
	ProxyEngine,
} from '@rahrow/core/runtime/proxy-engine.ts'
import type {
	ConnectionsSort,
	ConnectionsViewSettings,
	ProfileStore,
	SettingsStore,
} from '@rahrow/core/storage/json-store.ts'
import {
	parseImportedProfilesWithReport,
	type SubscriptionStore,
} from '@rahrow/core/subscription/subscription-import.ts'
import { useSelector } from '@tanstack/react-store'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { recordAdAction } from '../ads/record-ad-action.ts'
import { translate } from '../app/app-i18n.tsx'
import { presentLatency } from '../app/latency-presentation.ts'
import { removeProfilesPaced } from './connection-work-pacing.ts'
import {
	defaultConnectionsView,
	pruneConnectionGroups,
	restoredConnectionsView,
	setConnectionGroupOpen,
	setConnectionsHideUnreachable,
	setConnectionsQuery,
	setConnectionsSort,
	setConnectionsViewport,
} from './connections-view-state.ts'
import { runAsyncQueue } from './paced-profile-work.ts'
import {
	formatLatencyResult,
	type ProfileManagementCapabilities,
} from './profile-management-model.ts'
import {
	beginProfileSpeedTest,
	cancelProfileSpeedTest,
	finishProfileSpeedTest,
	hydrateProfileSpeedTestResults,
	type ProfileWorkProgress,
	profileSpeedTestResultBatchSize,
	profileSpeedTestStore,
	publishProfileSpeedTestResults,
	setProfileSpeedTestProgress,
} from './profile-speed-test-store.ts'

export interface ProfileManagementDependencies {
	readonly profileStore: ProfileStore
	readonly registry: ProtocolRegistry
	readonly engine: ProxyEngine
	readonly capabilities: ProfileManagementCapabilities
	readonly settingsStore?: SettingsStore
	readonly subscriptionStore?: Pick<SubscriptionStore, 'list'>
	readonly adGate?: AdGateController
	readonly logger: Logger
}

export type { ProfileWorkProgress } from './profile-speed-test-store.ts'

const idleWorkProgress: ProfileWorkProgress = {
	completed: 0,
	pending: 0,
	total: 0,
	status: 'idle',
}

export function useProfileManagement({
	profileStore,
	registry,
	engine,
	capabilities,
	settingsStore,
	subscriptionStore,
	adGate,
	logger,
}: ProfileManagementDependencies) {
	const actionLogger = useMemo(
		() => logger.child({ module: 'user-action' }),
		[logger],
	)
	const [profiles, setProfiles] = useState<readonly ConnectionProfile[]>([])
	const [isLoading, setIsLoading] = useState(true)
	const [initializationFailure, setInitializationFailure] = useState<{
		readonly title: string
		readonly description: string
		readonly detail: string
	} | null>(null)
	const initializedRef = useRef(false)
	const [selectedId, setSelectedId] = useState('')
	const [importText, setImportText] = useState('')
	const [profileName, setProfileName] = useState('')
	const [message, setMessage] = useState(() => translate('common.ready'))
	const speedTestingIds = useSelector(
		profileSpeedTestStore,
		(state) => state.testingIds,
	)
	const [connectionsView, setConnectionsView] = useState(defaultConnectionsView)
	const connectionsViewRef = useRef(connectionsView)
	const connectionsViewRestoredRef = useRef(false)
	const persistenceQueueRef = useRef(Promise.resolve())
	const [connectionsViewWarning, setConnectionsViewWarning] = useState<string>()
	const [importProgress, setImportProgress] =
		useState<ProfileWorkProgress>(idleWorkProgress)
	const importAbortRef = useRef<AbortController | undefined>(undefined)

	const persistSettings = useCallback(
		(
			update: (
				settings: Awaited<ReturnType<SettingsStore['read']>>,
			) => Awaited<ReturnType<SettingsStore['read']>>,
			failureMessage: string,
		) => {
			if (!settingsStore) return
			persistenceQueueRef.current = persistenceQueueRef.current
				.catch(() => undefined)
				.then(async () => {
					const settings = await settingsStore.read()
					await settingsStore.write(update(settings))
				})
				.catch((error) => {
					setConnectionsViewWarning(failureMessage)
					actionLogger.warn(
						{
							action: 'connections.view.persist',
							outcome: 'failure',
							errorType: error instanceof Error ? error.name : typeof error,
						},
						failureMessage,
					)
				})
		},
		[actionLogger, settingsStore],
	)

	const persistConnectionsView = useCallback(
		(view: ConnectionsViewSettings) =>
			persistSettings(
				(settings) => ({ ...settings, connectionsView: view }),
				translate('profiles.errors.viewSave'),
			),
		[persistSettings],
	)

	const persistLatencyResults = useCallback(
		(results: Readonly<Record<string, LatencyResult | undefined>>) => {
			const definedResults = Object.fromEntries(
				Object.entries(results)
					.filter(
						(entry): entry is [string, LatencyResult] => entry[1] !== undefined,
					)
					.sort((left, right) => right[1].checkedAt.localeCompare(left[1].checkedAt))
					.slice(0, 10_000),
			)
			persistSettings(
				(settings) => ({ ...settings, latencyResults: definedResults }),
				translate('profiles.errors.latencySave'),
			)
		},
		[persistSettings],
	)

	const updateConnectionsView = useCallback(
		(update: (current: ConnectionsViewSettings) => ConnectionsViewSettings) => {
			const next = update(connectionsViewRef.current)
			if (next === connectionsViewRef.current) return
			connectionsViewRef.current = next
			setConnectionsView(next)
			if (connectionsViewRestoredRef.current) persistConnectionsView(next)
		},
		[persistConnectionsView],
	)

	const reloadProfiles = useCallback(async () => {
		setIsLoading(true)
		try {
			const next = await profileStore.list()
			let settings: Awaited<ReturnType<SettingsStore['read']>> | undefined
			if (settingsStore) {
				try {
					settings = await settingsStore.read()
				} catch (error) {
					setConnectionsViewWarning(translate('profiles.errors.viewRestore'))
					actionLogger.warn(
						{
							action: 'connections.view.restore',
							outcome: 'failure',
							errorType: error instanceof Error ? error.name : typeof error,
						},
						'Connections view preferences could not be restored',
					)
				}
			}
			setProfiles(next)
			const profileIds = new Set(next.map((profile) => profile.id))
			const restoredLatencyResults = Object.fromEntries(
				Object.entries(settings?.latencyResults ?? {}).filter(([profileId]) =>
					profileIds.has(profileId),
				),
			)
			hydrateProfileSpeedTestResults(restoredLatencyResults)
			if (!connectionsViewRestoredRef.current) {
				const recovered = settings?.connectionsView?.recoveredFromInvalid === true
				const restored = restoredConnectionsView(settings?.connectionsView)
				connectionsViewRef.current = restored
				setConnectionsView(restored)
				connectionsViewRestoredRef.current = true
				if (recovered) {
					setConnectionsViewWarning(translate('profiles.errors.viewReset'))
					persistConnectionsView(restored)
				}
			}
			setSelectedId((current) => {
				const persisted = settings?.activeProfileId
				if (persisted && next.some((profile) => profile.id === persisted))
					return persisted
				if (current && next.some((profile) => profile.id === current))
					return current
				return next[0]?.id ?? ''
			})
			initializedRef.current = true
			setInitializationFailure(null)
		} catch {
			initializedRef.current = false
			setInitializationFailure({
				title: translate('profiles.errors.loadTitle'),
				description: translate('profiles.errors.loadDescription'),
				detail: translate('profiles.errors.loadDetail'),
			})
		} finally {
			setIsLoading(false)
		}
	}, [actionLogger, persistConnectionsView, profileStore, settingsStore])

	useEffect(() => {
		void reloadProfiles()
	}, [reloadProfiles])

	const selectedProfile = useMemo(
		() => profiles.find((profile) => profile.id === selectedId),
		[profiles, selectedId],
	)

	const importProfiles = useCallback(
		async (source: 'manual' | 'clipboard' | 'qr' | 'url', value: string) => {
			if (!initializedRef.current) return
			importAbortRef.current?.abort()
			const controller = new AbortController()
			importAbortRef.current = controller
			try {
				const result = parseImportedProfilesWithReport({ value, source }, registry)
				setImportProgress({
					completed: 0,
					pending: result.profiles.length,
					total: result.profiles.length,
					status: 'running',
				})
				await runAsyncQueue(
					result.profiles,
					(profile) => profileStore.save(profile),
					{
						concurrency: 1,
						wait: 8,
						signal: controller.signal,
						progressBatchSize: 25,
						onProgress: ({ completed, pending, total, status }) =>
							setImportProgress({
								completed,
								pending,
								total,
								status: status === 'canceled' ? 'canceled' : 'running',
							}),
					},
				)
				const imported = result.profiles

				if (imported.length === 0) {
					setImportProgress({
						completed: 0,
						pending: 0,
						total: 0,
						status: 'completed',
					})
					actionLogger.warn(
						{
							action: 'profile.import',
							outcome: 'empty',
							source,
							skippedCount: result.issues.length,
						},
						`Profile import from ${source} found no supported profiles`,
					)
					setMessage(translate('import.errors.noSupported'))
					return
				}

				actionLogger.info(
					{
						action: 'profile.import',
						outcome: 'success',
						source,
						profileCount: imported.length,
						skippedCount: result.issues.length,
					},
					`Imported ${imported.length} profile${imported.length === 1 ? '' : 's'} from ${source}`,
				)
				await reloadProfiles()
				setSelectedId(imported[0]?.id ?? '')
				setMessage(
					result.issues.length > 0
						? translate('import.status.importedWithSkipped', {
								count: imported.length,
								skipped: result.issues.length,
							})
						: translate('import.status.imported', { count: imported.length }),
				)
				setImportProgress({
					completed: imported.length,
					pending: 0,
					total: imported.length,
					status: 'completed',
				})
			} catch (error) {
				if (error instanceof DOMException && error.name === 'AbortError') {
					await reloadProfiles()
					setMessage(translate('profiles.status.importCanceled'))
					setImportProgress((current) => ({ ...current, status: 'canceled' }))
					return
				}
				setImportProgress((current) => ({ ...current, status: 'failed' }))
				actionLogger.warn(
					{
						action: 'profile.import',
						outcome: 'failure',
						source,
						errorType: error instanceof Error ? error.name : typeof error,
					},
					`Profile import from ${source} failed`,
				)
				throw error
			} finally {
				if (importAbortRef.current === controller)
					importAbortRef.current = undefined
			}
		},
		[actionLogger, profileStore, registry, reloadProfiles],
	)

	const selectProfile = useCallback((profile: ConnectionProfile) => {
		setSelectedId(profile.id)
		setProfileName(profile.metadata?.name ?? '')
	}, [])

	const activateProfile = useCallback(
		async (profile: ConnectionProfile) => {
			if (!initializedRef.current) return
			const previousProfileId = selectedId
			selectProfile(profile)
			if (settingsStore) {
				const settings = await settingsStore.read()
				await settingsStore.write({ ...settings, activeProfileId: profile.id })
			}
			try {
				await adGate?.recordProfileSelection(previousProfileId, profile.id)
			} catch (error) {
				actionLogger.warn(
					{
						action: 'advertising.profile-gate.record',
						outcome: 'failure',
						errorType: error instanceof Error ? error.name : typeof error,
					},
					'Profile selection changed, but the advertising gate could not be recorded',
				)
			}
			setMessage(
				translate('profiles.status.selected', {
					name: profile.metadata?.name ?? profile.id,
				}),
			)
		},
		[actionLogger, adGate, selectProfile, selectedId, settingsStore],
	)

	const updateSelectedName = useCallback(async () => {
		if (!initializedRef.current) return
		if (!selectedProfile) {
			setMessage(translate('home.errors.selectFirst'))
			return
		}

		await profileStore.save(renameProfile(selectedProfile, profileName))
		await reloadProfiles()
		setMessage(translate('profiles.status.updated'))
	}, [profileName, profileStore, reloadProfiles, selectedProfile])

	const saveProfile = useCallback(
		async (profile: ConnectionProfile) => {
			if (!initializedRef.current) return
			await profileStore.save(profile)
			await reloadProfiles()
			setSelectedId(profile.id)
			setProfileName(profile.metadata?.name ?? '')
			setMessage(translate('profiles.status.saved'))
		},
		[profileStore, reloadProfiles],
	)

	const duplicateProfileTarget = useCallback(
		async (profile: ConnectionProfile) => {
			if (!initializedRef.current) return
			const copy = duplicateProfile(profile, {
				suffix: profiles.length + 1,
			})
			await profileStore.save(copy)
			await reloadProfiles()
			setSelectedId(copy.id)
			setMessage(translate('profiles.status.duplicated'))
		},
		[profileStore, profiles.length, reloadProfiles],
	)

	const duplicateSelected = useCallback(async () => {
		if (!selectedProfile) {
			setMessage(translate('home.errors.selectFirst'))
			return
		}
		await duplicateProfileTarget(selectedProfile)
	}, [duplicateProfileTarget, selectedProfile])

	const deleteProfiles = useCallback(
		async (targets: readonly ConnectionProfile[]) => {
			if (!initializedRef.current) {
				return { removedCount: 0, skippedLockedCount: 0 }
			}
			const targetIds = new Set(targets.map(({ id }) => id))
			const [currentProfiles, currentSubscriptions] = await Promise.all([
				profileStore.list(),
				subscriptionStore?.list() ?? Promise.resolve([]),
			])
			const currentTargets = currentProfiles.filter(({ id }) => targetIds.has(id))
			const { removable, skippedLocked } = partitionProfilesByLock(
				currentTargets,
				protectedSubscriptionIds(currentSubscriptions),
			)
			await removeProfilesPaced(profileStore, removable)
			if (settingsStore) {
				const settings = await settingsStore.read()
				const removedIds = new Set(removable.map(({ id }) => id))
				if (settings.activeProfileId && removedIds.has(settings.activeProfileId)) {
					await settingsStore.write({ ...settings, activeProfileId: undefined })
				}
			}
			await reloadProfiles()
			setMessage(
				skippedLocked.length > 0
					? translate('profiles.toasts.lockedSkipped', {
							count: skippedLocked.length,
						})
					: translate('profiles.toasts.removed', { count: removable.length }),
			)
			return {
				removedCount: removable.length,
				skippedLockedCount: skippedLocked.length,
			}
		},
		[profileStore, reloadProfiles, settingsStore, subscriptionStore],
	)

	const deleteSelected = useCallback(async () => {
		if (!selectedProfile) {
			setMessage(translate('home.errors.selectFirst'))
			return { removedCount: 0, skippedLockedCount: 0 }
		}

		return deleteProfiles([selectedProfile])
	}, [deleteProfiles, selectedProfile])

	const importFromClipboard = useCallback(async () => {
		try {
			const value = await capabilities.clipboard.read()
			setImportText(value)
			await importProfiles('clipboard', value)
		} catch {
			setMessage(translate('import.errors.clipboardFailed'))
		}
	}, [capabilities.clipboard, importProfiles])

	const pasteImportText = useCallback(async () => {
		try {
			setImportText(await capabilities.clipboard.read())
		} catch (error) {
			const failure = new Error(translate('profiles.errors.clipboardUnavailable'))
			setMessage(failure.message)
			actionLogger.warn(
				{
					action: 'profile.import.paste',
					outcome: 'failure',
					errorType: error instanceof Error ? error.name : typeof error,
				},
				'Clipboard read failed',
			)
			throw failure
		}
	}, [actionLogger, capabilities.clipboard])

	const importFromQr = useCallback(async () => {
		if (!capabilities.qrDecoder) return

		try {
			const value = await capabilities.qrDecoder.decode(undefined)
			setImportText(value)
			await importProfiles('qr', value)
		} catch {
			setMessage(translate('profiles.errors.qrScan'))
		}
	}, [capabilities.qrDecoder, importProfiles])

	const testSelected = useCallback(async () => {
		if (!selectedProfile) {
			setMessage(translate('home.errors.selectFirst'))
			return
		}

		const eventId = createAdActionEventId('profile-ping')
		try {
			const result = await engine.test(selectedProfile)
			const next = publishProfileSpeedTestResults({ [selectedProfile.id]: result })
			persistLatencyResults(next)
			setMessage(formatLatencyResult(result))
			await recordAdAction(adGate, actionLogger, {
				id: eventId,
				action: 'profile-ping',
				outcome: 'completed',
			})
		} catch (error) {
			await recordAdAction(adGate, actionLogger, {
				id: eventId,
				action: 'profile-ping',
				outcome: 'failed',
			})
			throw error
		}
	}, [actionLogger, adGate, engine, persistLatencyResults, selectedProfile])

	const testProfiles = useCallback(
		async (
			targets: readonly ConnectionProfile[],
			action: Extract<
				AdAction,
				'profile-ping' | 'subscription-ping'
			> = 'profile-ping',
		) => {
			if (targets.length === 0) {
				setMessage(translate('profiles.errors.noneToTest'))
				return 'skipped' as const
			}
			const eventId = createAdActionEventId(action)
			const controller = beginProfileSpeedTest(
				targets.map((profile) => profile.id),
			)
			const completedResults: Record<string, LatencyResult> = {}
			const resultBatchSize = profileSpeedTestResultBatchSize(targets.length)
			let lastPublishedCompleted = 0
			const publishCompletedResults = () => {
				publishProfileSpeedTestResults(completedResults)
			}
			try {
				const results = await runAsyncQueue(
					targets,
					async (profile, { signal }) => {
						const result = await engine.test(profile)
						if (signal.aborted)
							throw new DOMException('Operation canceled', 'AbortError')
						completedResults[profile.id] = result
						return result
					},
					{
						concurrency: 4,
						wait: 12,
						signal: controller.signal,
						progressBatchSize: Math.max(1, Math.ceil(targets.length / 100)),
						onProgress: ({ completed, pending, total, status }) => {
							if (
								completed - lastPublishedCompleted >= resultBatchSize ||
								completed === total
							) {
								publishCompletedResults()
								lastPublishedCompleted = completed
							}
							setProfileSpeedTestProgress({
								completed,
								pending,
								total,
								status: status === 'canceled' ? 'canceled' : 'running',
							})
						},
					},
				)
				const measured = results.filter(
					(result) => presentLatency(result).kind === 'measured',
				).length
				setProfileSpeedTestProgress({
					completed: targets.length,
					pending: 0,
					total: targets.length,
					status: 'completed',
				})
				setMessage(
					translate('profiles.status.latencyMeasured', {
						measured,
						total: targets.length,
					}),
				)
				await recordAdAction(adGate, actionLogger, {
					id: eventId,
					action,
					outcome: 'completed',
				})
				return 'completed' as const
			} catch (error) {
				if (error instanceof DOMException && error.name === 'AbortError') {
					setProfileSpeedTestProgress({
						...profileSpeedTestStore.state.progress,
						status: 'canceled',
					})
					setMessage(translate('profiles.status.latencyCanceled'))
					await recordAdAction(adGate, actionLogger, {
						id: eventId,
						action,
						outcome: 'cancelled',
					})
					return 'canceled' as const
				}
				setProfileSpeedTestProgress({
					...profileSpeedTestStore.state.progress,
					status: 'failed',
				})
				await recordAdAction(adGate, actionLogger, {
					id: eventId,
					action,
					outcome: 'failed',
				})
				throw error
			} finally {
				if (Object.keys(completedResults).length > 0) {
					publishCompletedResults()
					persistLatencyResults(profileSpeedTestStore.state.results)
				}
				finishProfileSpeedTest(controller)
			}
		},
		[actionLogger, adGate, engine, persistLatencyResults],
	)

	const setViewQuery = useCallback(
		(query: string) =>
			updateConnectionsView((current) => setConnectionsQuery(current, query)),
		[updateConnectionsView],
	)
	const setViewSort = useCallback(
		(sort: ConnectionsSort) =>
			updateConnectionsView((current) => setConnectionsSort(current, sort)),
		[updateConnectionsView],
	)
	const setViewHideUnreachable = useCallback(
		(hideUnreachable: boolean) =>
			updateConnectionsView((current) =>
				setConnectionsHideUnreachable(current, hideUnreachable),
			),
		[updateConnectionsView],
	)
	const setGroupOpen = useCallback(
		(key: string, open: boolean) =>
			updateConnectionsView((current) =>
				setConnectionGroupOpen(current, key, open),
			),
		[updateConnectionsView],
	)
	const pruneViewGroups = useCallback(
		(activeKeys: ReadonlySet<string>) =>
			updateConnectionsView((current) =>
				pruneConnectionGroups(current, activeKeys),
			),
		[updateConnectionsView],
	)
	const setViewport = useCallback(
		(scrollOffset: number, loadedProfileCount: number) =>
			updateConnectionsView((current) =>
				setConnectionsViewport(current, { scrollOffset, loadedProfileCount }),
			),
		[updateConnectionsView],
	)

	return {
		state: {
			profiles,
			isLoading,
			isInitialized: initializedRef.current,
			initializationFailure,
			selectedId,
			importText,
			profileName,
			message,
			speedTestingIds,
			connectionsView,
			connectionsViewWarning,
			importProgress,
		},
		actions: {
			reloadProfiles,
			setImportText,
			setProfileName,
			selectProfile,
			activateProfile,
			importProfiles,
			updateSelectedName,
			saveProfile,
			duplicateSelected,
			duplicateProfile: duplicateProfileTarget,
			deleteSelected,
			deleteProfiles,
			importFromClipboard,
			pasteImportText,
			importFromQr,
			testSelected,
			testProfiles,
			cancelImport: () => importAbortRef.current?.abort(),
			cancelSpeedTests: cancelProfileSpeedTest,
			setConnectionsQuery: setViewQuery,
			setConnectionsSort: setViewSort,
			setConnectionsHideUnreachable: setViewHideUnreachable,
			setConnectionGroupOpen: setGroupOpen,
			pruneConnectionGroups: pruneViewGroups,
			setConnectionsViewport: setViewport,
		},
	}
}
