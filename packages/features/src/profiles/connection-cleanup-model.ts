import {
	isProfileProtectedByLock,
	protectedSubscriptionIds,
} from '@rahrow/core/profile/connection-lock-policy.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type { LatencyResult } from '@rahrow/core/runtime/proxy-engine.ts'
import type { Subscription } from '@rahrow/core/subscription/subscription-import.ts'
import { presentLatency } from '../app/latency-presentation.ts'
import { runInPacedBatches } from './paced-profile-work.ts'

export type CleanupProbeStatus = 'passed' | 'failed' | 'timeout'

export interface CleanupProbeResult {
	readonly id: string
	readonly status: CleanupProbeStatus
}

export interface ConnectionCleanupReport {
	readonly checkedProfileCount: number
	readonly checkedSubscriptionCount: number
	readonly keptProfileCount: number
	readonly keptSubscriptionCount: number
	readonly removeProfileIds: ReadonlySet<string>
	readonly removeSubscriptionIds: ReadonlySet<string>
	readonly lockedFailedSubscriptionCount: number
	readonly lockedFailedProfileCount: number
	readonly skippedLockedCount: number
}

function deriveCleanupReport({
	profiles,
	subscriptions,
	failedProfileIds,
	failedSubscriptionIds,
}: {
	readonly profiles: readonly ConnectionProfile[]
	readonly subscriptions: readonly Subscription[]
	readonly failedProfileIds: ReadonlySet<string>
	readonly failedSubscriptionIds: ReadonlySet<string>
}): ConnectionCleanupReport {
	const subscriptionById = new Map(
		subscriptions.map((subscription) => [subscription.id, subscription]),
	)
	const lockedSubscriptionIds = protectedSubscriptionIds(subscriptions)
	const lockedFailedSubscriptionCount = [...failedSubscriptionIds].filter((id) =>
		lockedSubscriptionIds.has(id),
	).length
	const lockedFailedProfileCount = profiles.filter(
		(profile) =>
			failedProfileIds.has(profile.id) &&
			isProfileProtectedByLock(profile, lockedSubscriptionIds),
	).length
	const removeSubscriptionIds = new Set(
		[...failedSubscriptionIds].filter(
			(id) => subscriptionById.has(id) && !lockedSubscriptionIds.has(id),
		),
	)
	const removeProfileIds = new Set(
		profiles
			.filter(
				(profile) =>
					failedProfileIds.has(profile.id) &&
					!isProfileProtectedByLock(profile, lockedSubscriptionIds),
			)
			.map((profile) => profile.id),
	)

	return {
		checkedProfileCount: failedProfileIds.size,
		checkedSubscriptionCount: failedSubscriptionIds.size,
		keptProfileCount: profiles.length - removeProfileIds.size,
		keptSubscriptionCount: subscriptions.length - removeSubscriptionIds.size,
		removeProfileIds,
		removeSubscriptionIds,
		lockedFailedSubscriptionCount,
		lockedFailedProfileCount,
		skippedLockedCount: lockedFailedSubscriptionCount + lockedFailedProfileCount,
	}
}

export function cleanupProfileProbeResult(
	result: LatencyResult,
): CleanupProbeResult {
	const kind = presentLatency(result).kind
	return {
		id: result.profileId,
		status:
			kind === 'measured' ? 'passed' : kind === 'timeout' ? 'timeout' : 'failed',
	}
}

export function buildConnectionCleanupReport({
	profiles,
	subscriptions,
	profileResults,
	subscriptionResults,
}: {
	readonly profiles: readonly ConnectionProfile[]
	readonly subscriptions: readonly Subscription[]
	readonly profileResults: readonly CleanupProbeResult[]
	readonly subscriptionResults: readonly CleanupProbeResult[]
}): ConnectionCleanupReport {
	const failedProfileIds = new Set(
		profileResults
			.filter((result) => result.status !== 'passed')
			.map((result) => result.id),
	)
	const failedSubscriptionIds = new Set(
		subscriptionResults
			.filter((result) => result.status !== 'passed')
			.map((result) => result.id),
	)
	const report = deriveCleanupReport({
		profiles,
		subscriptions,
		failedProfileIds,
		failedSubscriptionIds,
	})
	return {
		...report,
		checkedProfileCount: profileResults.length,
		checkedSubscriptionCount: subscriptionResults.length,
	}
}

export async function buildConnectionCleanupReportPaced(input: {
	readonly profiles: readonly ConnectionProfile[]
	readonly subscriptions: readonly Subscription[]
	readonly profileResults: readonly CleanupProbeResult[]
	readonly subscriptionResults: readonly CleanupProbeResult[]
}): Promise<ConnectionCleanupReport> {
	const failedProfileIdBatches = await runInPacedBatches(
		input.profileResults,
		(batch) =>
			batch
				.filter((result) => result.status !== 'passed')
				.map((result) => result.id),
		{ batchSize: 128, wait: 1 },
	)
	const failedSubscriptionIdBatches = await runInPacedBatches(
		input.subscriptionResults,
		(batch) =>
			batch
				.filter((result) => result.status !== 'passed')
				.map((result) => result.id),
		{ batchSize: 128, wait: 1 },
	)
	const failedProfileIds = new Set(failedProfileIdBatches.flat())
	const failedSubscriptionIds = new Set(failedSubscriptionIdBatches.flat())
	const report = deriveCleanupReport({
		profiles: input.profiles,
		subscriptions: input.subscriptions,
		failedProfileIds,
		failedSubscriptionIds,
	})
	return {
		...report,
		checkedProfileCount: input.profileResults.length,
		checkedSubscriptionCount: input.subscriptionResults.length,
	}
}
