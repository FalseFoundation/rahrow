import type { Subscription } from '@rahrow/core/subscription/subscription-import.ts'

/** Refresh remote sources that have not been updated within this window. */
export const STALE_SUBSCRIPTION_MAX_AGE_MS = 24 * 60 * 60 * 1000

export function isSubscriptionExpired(
	subscription: Subscription,
	nowMs: number = Date.now(),
): boolean {
	const expiresAt = subscription.metadata?.usage?.expiresAt
	if (!expiresAt) return false
	const expiresMs = Date.parse(expiresAt)
	return Number.isFinite(expiresMs) && expiresMs <= nowMs
}

export function isSubscriptionStale(
	subscription: Subscription,
	nowMs: number = Date.now(),
	maxAgeMs: number = STALE_SUBSCRIPTION_MAX_AGE_MS,
): boolean {
	if (!subscription.updatedAt) return true
	const updatedMs = Date.parse(subscription.updatedAt)
	if (!Number.isFinite(updatedMs)) return true
	return nowMs - updatedMs >= maxAgeMs
}

export function subscriptionsNeedingRefresh(
	subscriptions: readonly Subscription[],
	nowMs: number = Date.now(),
	maxAgeMs: number = STALE_SUBSCRIPTION_MAX_AGE_MS,
): readonly Subscription[] {
	return subscriptions.filter(
		(subscription) =>
			!isSubscriptionExpired(subscription, nowMs) &&
			isSubscriptionStale(subscription, nowMs, maxAgeMs),
	)
}
