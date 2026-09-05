import type { Subscription } from '@rahrow/core/subscription/subscription-import.ts'
import {
	type AsyncQueueProgress,
	type AsyncQueueWorkerContext,
	runAsyncQueue,
} from '../profiles/paced-profile-work.ts'

export type SubscriptionRefreshQueueProgress = AsyncQueueProgress

export const SUBSCRIPTION_REFRESH_CONCURRENCY = 2
export const SUBSCRIPTION_REFRESH_WAIT_MS = 40

export interface SubscriptionRefreshQueueOptions {
	readonly concurrency?: number
	readonly wait?: number
	readonly signal?: AbortSignal
	readonly onProgress?: (progress: AsyncQueueProgress) => void
}

export function runSubscriptionRefreshQueue<TResult>(
	subscriptions: readonly Subscription[],
	worker: (
		subscription: Subscription,
		context: AsyncQueueWorkerContext,
	) => Promise<TResult>,
	{
		concurrency = SUBSCRIPTION_REFRESH_CONCURRENCY,
		wait = SUBSCRIPTION_REFRESH_WAIT_MS,
		signal,
		onProgress,
	}: SubscriptionRefreshQueueOptions = {},
): Promise<readonly TResult[]> {
	return runAsyncQueue(subscriptions, worker, {
		concurrency,
		wait,
		signal,
		progressBatchSize: 1,
		onProgress,
	})
}
