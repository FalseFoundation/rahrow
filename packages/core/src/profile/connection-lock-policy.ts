import type { Subscription } from '../subscription/subscription-import.ts'
import type { ConnectionProfile } from './connection-profile.ts'

export function protectedSubscriptionIds(
	subscriptions: readonly Pick<Subscription, 'id' | 'locked'>[],
): ReadonlySet<string> {
	return new Set(
		subscriptions
			.filter((subscription) => subscription.locked === true)
			.map((subscription) => subscription.id),
	)
}

export function isProfileProtectedByLock(
	profile: ConnectionProfile,
	lockedSubscriptionIds: ReadonlySet<string>,
): boolean {
	const subscriptionId = profile.metadata?.subscriptionId
	return (
		subscriptionId !== undefined && lockedSubscriptionIds.has(subscriptionId)
	)
}

export function partitionProfilesByLock(
	profiles: readonly ConnectionProfile[],
	lockedSubscriptionIds: ReadonlySet<string>,
): {
	readonly removable: readonly ConnectionProfile[]
	readonly skippedLocked: readonly ConnectionProfile[]
} {
	const removable: ConnectionProfile[] = []
	const skippedLocked: ConnectionProfile[] = []

	for (const profile of profiles) {
		if (isProfileProtectedByLock(profile, lockedSubscriptionIds)) {
			skippedLocked.push(profile)
		} else {
			removable.push(profile)
		}
	}

	return { removable, skippedLocked }
}
