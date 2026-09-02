import type { ConnectionProfile } from './connection-profile.ts'

export interface ProfileOwnership {
	readonly standalone: readonly ConnectionProfile[]
	readonly bySubscription: ReadonlyMap<string, readonly ConnectionProfile[]>
}

export function partitionProfilesByOwnership(
	profiles: readonly ConnectionProfile[],
): ProfileOwnership {
	const standalone: ConnectionProfile[] = []
	const bySubscription = new Map<string, ConnectionProfile[]>()

	for (const profile of profiles) {
		const subscriptionId = profile.metadata?.subscriptionId?.trim()

		if (!subscriptionId) {
			standalone.push(profile)
			continue
		}

		const owned = bySubscription.get(subscriptionId) ?? []
		owned.push(profile)
		bySubscription.set(subscriptionId, owned)
	}

	return { standalone, bySubscription }
}
