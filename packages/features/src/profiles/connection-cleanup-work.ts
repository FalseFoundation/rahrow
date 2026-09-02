import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type { ProxyEngine } from '@rahrow/core/runtime/proxy-engine.ts'
import type {
	Subscription,
	SubscriptionFetcher,
} from '@rahrow/core/subscription/subscription-import.ts'
import {
	buildConnectionCleanupReportPaced,
	type CleanupProbeResult,
	type ConnectionCleanupReport,
	cleanupProfileProbeResult,
} from './connection-cleanup-model.ts'
import { runAsyncQueue } from './paced-profile-work.ts'

export interface ConnectionCleanupProgress {
	readonly completed: number
	readonly total: number
	readonly phase: 'profiles' | 'subscriptions'
}

export interface ConnectionCleanupPacingPolicy {
	readonly profileConcurrency: number
	readonly profileWait: number
	readonly subscriptionConcurrency: number
	readonly subscriptionWait: number
	readonly subscriptionTimeoutMs: number
}

const defaultPacingPolicy: ConnectionCleanupPacingPolicy = {
	profileConcurrency: 2,
	profileWait: 80,
	subscriptionConcurrency: 1,
	subscriptionWait: 240,
	subscriptionTimeoutMs: 30_000,
}

class SubscriptionProbeTimeoutError extends Error {}

export async function scanConnectionsForCleanup({
	profiles,
	subscriptions,
	engine,
	subscriptionFetcher,
	signal,
	onProgress,
	pacing = defaultPacingPolicy,
}: {
	readonly profiles: readonly ConnectionProfile[]
	readonly subscriptions: readonly Subscription[]
	readonly engine: Pick<ProxyEngine, 'test'>
	readonly subscriptionFetcher: SubscriptionFetcher
	readonly signal: AbortSignal
	readonly onProgress?: (progress: ConnectionCleanupProgress) => void
	readonly pacing?: ConnectionCleanupPacingPolicy
}): Promise<ConnectionCleanupReport> {
	const total = profiles.length + subscriptions.length
	const progressBatchSize = Math.max(1, Math.ceil(total / 100))
	const profileResults = await runAsyncQueue(
		profiles,
		async (profile, context) => {
			try {
				const result = await engine.test(profile)
				throwIfAborted(context.signal)
				return cleanupProfileProbeResult(result)
			} catch {
				throwIfAborted(context.signal)
				return { id: profile.id, status: 'failed' } satisfies CleanupProbeResult
			}
		},
		{
			concurrency: pacing.profileConcurrency,
			wait: pacing.profileWait,
			signal,
			progressBatchSize,
			onProgress: ({ completed, status }) => {
				if (status === 'canceled') return
				onProgress?.({ completed, total, phase: 'profiles' })
			},
		},
	)

	const subscriptionResults = await runAsyncQueue(
		subscriptions,
		async (subscription, context) => {
			try {
				await withDeadline(
					context.signal,
					pacing.subscriptionTimeoutMs,
					(probeSignal) =>
						subscriptionFetcher.fetch(subscription, { signal: probeSignal }),
				)
				return {
					id: subscription.id,
					status: 'passed',
				} satisfies CleanupProbeResult
			} catch (error) {
				throwIfAborted(context.signal)
				return {
					id: subscription.id,
					status:
						error instanceof SubscriptionProbeTimeoutError ? 'timeout' : 'failed',
				} satisfies CleanupProbeResult
			}
		},
		{
			concurrency: pacing.subscriptionConcurrency,
			wait: pacing.subscriptionWait,
			signal,
			progressBatchSize,
			onProgress: ({ completed, status }) => {
				if (status === 'canceled') return
				onProgress?.({
					completed: profiles.length + completed,
					total,
					phase: 'subscriptions',
				})
			},
		},
	)

	return buildConnectionCleanupReportPaced({
		profiles,
		subscriptions,
		profileResults,
		subscriptionResults,
	})
}

async function withDeadline<TResult>(
	parentSignal: AbortSignal,
	timeoutMs: number,
	work: (signal: AbortSignal) => Promise<TResult>,
): Promise<TResult> {
	throwIfAborted(parentSignal)
	const controller = new AbortController()
	let timedOut = false
	const abort = () => controller.abort(parentSignal.reason)
	parentSignal.addEventListener('abort', abort, { once: true })
	let timer: ReturnType<typeof setTimeout> | undefined
	const deadline = new Promise<never>((_resolve, reject) => {
		timer = setTimeout(() => {
			timedOut = true
			const error = new SubscriptionProbeTimeoutError(
				'Subscription check timed out',
			)
			controller.abort(error)
			reject(error)
		}, timeoutMs)
	})

	try {
		return await Promise.race([work(controller.signal), deadline])
	} catch (error) {
		if (timedOut)
			throw new SubscriptionProbeTimeoutError('Subscription check timed out')
		throw error
	} finally {
		if (timer) clearTimeout(timer)
		parentSignal.removeEventListener('abort', abort)
	}
}

function throwIfAborted(signal: AbortSignal): void {
	if (signal.aborted) throw new DOMException('Operation canceled', 'AbortError')
}
