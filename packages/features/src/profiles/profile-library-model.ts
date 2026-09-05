import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { partitionProfilesByOwnership } from '@rahrow/core/profile/profile-ownership.ts'
import type { ProtocolRegistry } from '@rahrow/core/protocol/connection-protocol.ts'
import type { ConnectionsSort } from '@rahrow/core/storage/json-store.ts'
import type { Subscription } from '@rahrow/core/subscription/subscription-import.ts'

import { translate } from '../app/app-i18n.tsx'
import {
	compareLatencyResults,
	type LatencyProbeResult,
} from '../app/latency-presentation.ts'
import { formatRelativeTime } from '../app/relative-time.ts'
import {
	orphanedConnectionGroup,
	STANDALONE_CONNECTION_GROUP,
	subscriptionConnectionGroup,
} from './connections-view-state.ts'

export type SortValue = ConnectionsSort

export type ActionTarget =
	| { kind: 'local'; profiles: readonly ConnectionProfile[] }
	| { kind: 'profile'; profile: ConnectionProfile; locked?: boolean }
	| {
			kind: 'subscription'
			subscription: Subscription
			profiles: readonly ConnectionProfile[]
	  }

export type ConnectionDrawerName =
	| 'actions'
	| 'edit-profile'
	| 'edit-subscription'
	| 'import'
	| 'sort'
	| null

export const PROFILE_LIST_VIRTUALIZATION_THRESHOLD = 12

export function profileName(profile: ConnectionProfile): string {
	return profile.metadata?.name ?? profile.endpoint.host
}

export function filterAndSortProfiles({
	profiles,
	query,
	sort,
	speedTests,
}: {
	readonly profiles: readonly ConnectionProfile[]
	readonly query: string
	readonly sort: SortValue
	readonly speedTests: Readonly<Record<string, LatencyProbeResult | undefined>>
}): ConnectionProfile[] {
	const normalizedQuery = query.trim().toLowerCase()
	const visible = normalizedQuery
		? profiles.filter((profile) =>
				`${profile.metadata?.name ?? ''} ${profile.protocol} ${profile.endpoint.host}`
					.toLowerCase()
					.includes(normalizedQuery),
			)
		: [...profiles]

	if (sort === 'default') return visible

	return visible.sort((left, right) => {
		if (sort === 'speed-test') {
			const latencyComparison = compareLatencyResults(
				speedTests[left.id],
				speedTests[right.id],
			)
			if (latencyComparison !== 0) return latencyComparison
			return (
				profileName(left).localeCompare(profileName(right)) ||
				left.id.localeCompare(right.id)
			)
		}
		if (sort === 'name')
			return profileName(left).localeCompare(profileName(right))
		if (sort === 'protocol') return left.protocol.localeCompare(right.protocol)
		if (sort === 'endpoint')
			return left.endpoint.host.localeCompare(right.endpoint.host)
		return 0
	})
}

export function shouldVirtualizeProfileList(profileCount: number): boolean {
	return profileCount > PROFILE_LIST_VIRTUALIZATION_THRESHOLD
}

export function serializeProfiles(
	profiles: readonly ConnectionProfile[],
	registry: Pick<ProtocolRegistry, 'serialize'>,
): string {
	return profiles.map((profile) => registry.serialize(profile)).join('\n')
}

export function removeTitle(target: ActionTarget): string {
	if (target.kind === 'subscription')
		return translate('profiles.remove.subscription')
	if (target.kind === 'local' && target.profiles.length !== 1)
		return translate('profiles.remove.connections')
	return translate('profiles.remove.connection')
}

export function targetProfiles(
	target: ActionTarget,
): readonly ConnectionProfile[] {
	return target.kind === 'profile' ? [target.profile] : target.profiles
}

export function actionTargetName(target: ActionTarget): string {
	if (target.kind === 'profile') return profileName(target.profile)
	if (target.kind === 'subscription')
		return target.subscription.name ?? target.subscription.id
	return translate('profiles.groups.standaloneName')
}

export function connectionDrawerCopy(
	drawer: ConnectionDrawerName,
	target: ActionTarget,
): { readonly title: string; readonly description?: string } {
	const targetName = actionTargetName(target)
	const title =
		drawer === 'import'
			? translate('import.addConnection')
			: drawer === 'edit-subscription'
				? translate('profiles.drawer.editSubscription')
				: drawer === 'edit-profile'
					? translate('profiles.drawer.editConnection')
					: drawer === 'sort'
						? translate('profiles.actions.sort')
						: targetName

	if (drawer !== 'actions') {
		return drawer === 'import'
			? { title, description: translate('profiles.drawer.importDescription') }
			: { title }
	}

	const locked =
		(target.kind === 'subscription' && target.subscription.locked) ||
		(target.kind === 'profile' && target.locked)
	return locked
		? {
				title,
				description: translate('profiles.drawer.lockedDescription', {
					target: targetName,
				}),
			}
		: { title }
}

export function deriveConnectionLibrary({
	profiles,
	query,
	sort,
	speedTests,
	subscriptions,
}: {
	readonly profiles: readonly ConnectionProfile[]
	readonly query: string
	readonly sort: SortValue
	readonly speedTests: Readonly<Record<string, LatencyProbeResult | undefined>>
	readonly subscriptions: readonly Subscription[]
}) {
	const visibleProfiles = filterAndSortProfiles({
		profiles,
		query,
		sort,
		speedTests,
	})
	const ownership = partitionProfilesByOwnership(visibleProfiles)
	const allOwnership = partitionProfilesByOwnership(profiles)
	const subscriptionIds = new Set(subscriptions.map(({ id }) => id))
	const orphanedSubscriptionIds = [...ownership.bySubscription.keys()].filter(
		(id) => !subscriptionIds.has(id),
	)
	const activeGroupKeys = new Set([
		STANDALONE_CONNECTION_GROUP,
		...subscriptions.map(({ id }) => subscriptionConnectionGroup(id)),
		...orphanedSubscriptionIds.map(orphanedConnectionGroup),
	])

	return {
		visibleProfiles,
		ownership,
		allOwnership,
		orphanedSubscriptionIds,
		activeGroupKeys,
		hasVisibleProfiles: visibleProfiles.length > 0,
		hasQuery: query.trim().length > 0,
	}
}

export function subscriptionDetail(subscription: Subscription, count: number) {
	const updated = subscription.updatedAt
		? formatRelativeTime(subscription.updatedAt)
		: translate('common.never')
	return translate('profiles.groups.subscriptionDetail', { count, updated })
}
