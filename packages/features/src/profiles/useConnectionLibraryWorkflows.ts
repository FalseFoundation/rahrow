import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type { ProtocolRegistry } from '@rahrow/core/protocol/connection-protocol.ts'
import type { Subscription } from '@rahrow/core/subscription/subscription-import.ts'
import { toast } from '@rahrow/ui/components/ui/sonner.tsx'
import { useCallback, useState } from 'react'
import { translate } from '../app/app-i18n.tsx'
import type { ShareDrawerPayload } from '../share/ShareDrawer.tsx'
import { serializeProfilesPaced } from './connection-work-pacing.ts'
import {
	type ActionTarget,
	type ConnectionDrawerName,
	connectionDrawerCopy,
	profileName,
	targetProfiles,
} from './profile-library-model.ts'
import type { useProfileManagement } from './useProfileManagement.ts'

type ProfileActions = ReturnType<typeof useProfileManagement>['actions']

export function useConnectionLibraryWorkflows({
	actions,
	registry,
	subscriptions,
	onAddSubscription,
	onRefreshSubscription,
	onRefreshSubscriptions,
	onRemoveSubscription,
	onUpdateSubscription,
	openShare,
	onProfileActivated,
}: {
	readonly actions: ProfileActions
	readonly registry: Pick<ProtocolRegistry, 'serialize'>
	readonly subscriptions: readonly Subscription[]
	readonly onAddSubscription: (url: string) => Promise<void>
	readonly onRefreshSubscription: (subscription: Subscription) => Promise<void>
	readonly onRefreshSubscriptions: (
		subscriptions: readonly Subscription[],
	) => Promise<void>
	readonly onRemoveSubscription: (id: string) => Promise<void>
	readonly onUpdateSubscription: (subscription: Subscription) => Promise<void>
	readonly openShare: (payload: ShareDrawerPayload) => void
	readonly onProfileActivated: () => Promise<void>
}) {
	const [drawer, setDrawer] = useState<ConnectionDrawerName>(null)
	const [nestedDrawer, setNestedDrawer] = useState<
		'edit-profile' | 'edit-subscription' | null
	>(null)
	const [target, setTarget] = useState<ActionTarget>({
		kind: 'local',
		profiles: [],
	})
	const [searchOpen, setSearchOpen] = useState(false)
	const [deleteOpen, setDeleteOpen] = useState(false)
	const selectedTargetProfiles = targetProfiles(target)

	const openActions = useCallback((nextTarget: ActionTarget) => {
		setDeleteOpen(false)
		setNestedDrawer(null)
		setTarget(nextTarget)
		setDrawer('actions')
	}, [])

	const closeDrawer = useCallback(() => {
		setDeleteOpen(false)
		setNestedDrawer(null)
		setDrawer(null)
	}, [])
	const closeNestedDrawer = useCallback(() => setNestedDrawer(null), [])
	const activateProfile = useCallback(
		async (profile: ConnectionProfile) => {
			await actions.activateProfile(profile)
			await onProfileActivated()
		},
		[actions.activateProfile, onProfileActivated],
	)

	const refreshConnections = useCallback(async () => {
		try {
			await onRefreshSubscriptions(subscriptions)
			await actions.reloadProfiles()
			toast.success(translate('profiles.toasts.refreshed'))
		} catch {
			await actions.reloadProfiles()
			toast.error(translate('profiles.toasts.refreshFailed'), {
				description: translate('profiles.toasts.pullToRetry'),
			})
		}
	}, [actions.reloadProfiles, onRefreshSubscriptions, subscriptions])

	const refreshSubscription = useCallback(
		async (subscription: Subscription) => {
			await onRefreshSubscription(subscription)
			await actions.reloadProfiles()
		},
		[actions.reloadProfiles, onRefreshSubscription],
	)

	const importUrl = useCallback(
		async (value: string) => {
			await yieldToMainThread()
			const normalized = value.trim()
			if (normalized.startsWith('http://') || normalized.startsWith('https://')) {
				await onAddSubscription(normalized)
				await actions.reloadProfiles()
			} else await actions.importProfiles('url', normalized)
			closeDrawer()
		},
		[
			actions.importProfiles,
			actions.reloadProfiles,
			closeDrawer,
			onAddSubscription,
		],
	)

	const exportTarget = useCallback(async () => {
		if (target.kind === 'subscription') {
			const title =
				target.subscription.name ?? translate('profiles.share.subscription')
			openShare({
				title,
				description: translate('profiles.share.subscriptionDescription'),
				label: translate('profiles.share.subscriptionUrl'),
				value: target.subscription.url,
				filename: title,
			})
			return
		}

		if (selectedTargetProfiles.length === 0) {
			toast.error(translate('profiles.share.none'))
			return
		}
		const title =
			target.kind === 'profile'
				? profileName(target.profile)
				: translate('profiles.share.standalone')
		openShare({
			title,
			label:
				selectedTargetProfiles.length === 1
					? translate('profiles.share.connectionUrl')
					: translate('profiles.share.connectionUrls'),
			value: await serializeProfilesPaced(selectedTargetProfiles, registry),
			filename: title,
		})
	}, [openShare, registry, selectedTargetProfiles, target])

	const beginEdit = useCallback(() => {
		setNestedDrawer(
			target.kind === 'subscription' ? 'edit-subscription' : 'edit-profile',
		)
	}, [target.kind])

	const requestDelete = useCallback(() => {
		setDeleteOpen(true)
	}, [])

	const confirmDelete = useCallback(async () => {
		let removedCount = selectedTargetProfiles.length
		let skippedLockedCount = 0
		if (target.kind === 'profile' || target.kind === 'local') {
			const outcome = await actions.deleteProfiles(
				target.kind === 'profile' ? [target.profile] : target.profiles,
			)
			removedCount = outcome?.removedCount ?? removedCount
			skippedLockedCount = outcome?.skippedLockedCount ?? 0
		}
		if (target.kind === 'subscription') {
			await onRemoveSubscription(target.subscription.id)
			await actions.reloadProfiles()
		}
		setDeleteOpen(false)
		closeDrawer()
		if (skippedLockedCount > 0) {
			toast.info(
				translate('profiles.toasts.lockedSkipped', {
					count: skippedLockedCount,
				}),
			)
		} else {
			toast.success(translate('profiles.toasts.removed', { count: removedCount }))
		}
	}, [
		actions.deleteProfiles,
		actions.reloadProfiles,
		closeDrawer,
		onRemoveSubscription,
		target,
		selectedTargetProfiles.length,
	])

	return {
		drawer,
		nestedDrawer,
		target,
		selectedTargetProfiles,
		searchOpen,
		deleteOpen,
		drawerCopy: connectionDrawerCopy(drawer, target),
		nestedDrawerCopy: connectionDrawerCopy(nestedDrawer, target),
		setDrawer,
		setSearchOpen,
		setDeleteOpen,
		setTarget,
		openActions,
		closeDrawer,
		closeNestedDrawer,
		activateProfile,
		refreshConnections,
		refreshSubscription,
		importUrl,
		exportTarget,
		beginEdit,
		requestDelete,
		confirmDelete,
		testTarget: () => {
			const profiles = selectedTargetProfiles
			closeDrawer()
			void actions
				.testProfiles(
					profiles,
					target.kind === 'subscription' ? 'subscription-ping' : 'profile-ping',
				)
				.then((outcome) => {
					if (outcome !== 'completed') return
					toast.success(
						translate('profiles.toasts.latencyComplete', { count: profiles.length }),
					)
				})
				.catch(() =>
					toast.error(translate('latency.failed'), {
						description: translate('profiles.toasts.testAgain'),
					}),
				)
		},
		saveProfile: async (profile: ConnectionProfile) => {
			await actions.saveProfile(profile)
			setTarget({ kind: 'profile', profile })
			closeNestedDrawer()
		},
		saveSubscription: async (subscription: Subscription) => {
			await onUpdateSubscription(subscription)
			setTarget((current) =>
				current.kind === 'subscription' ? { ...current, subscription } : current,
			)
			closeNestedDrawer()
		},
	}
}

function yieldToMainThread() {
	return new Promise<void>((resolve) => setTimeout(resolve, 0))
}
