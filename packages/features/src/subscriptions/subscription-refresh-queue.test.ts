import type { Subscription } from '@rahrow/core/subscription/subscription-import.ts'
import { describe, expect, it, vi } from 'vitest'
import { runSubscriptionRefreshQueue } from './subscription-refresh-queue.ts'

const subscriptions = Array.from({ length: 5 }, (_, index) => ({
	id: `subscription-${index}`,
	url: `https://provider-${index}.example/subscription`,
})) satisfies readonly Subscription[]

describe('subscription refresh queue', () => {
	it('bounds concurrency and reports aggregate pending progress', async () => {
		let active = 0
		let peak = 0
		const progress: Array<{ completed: number; pending: number }> = []

		await runSubscriptionRefreshQueue(
			subscriptions,
			async () => {
				active += 1
				peak = Math.max(peak, active)
				await Promise.resolve()
				active -= 1
			},
			{
				wait: 0,
				onProgress: ({ completed, pending }) =>
					progress.push({ completed, pending }),
			},
		)

		expect(peak).toBe(2)
		expect(progress[0]).toEqual({ completed: 0, pending: 5 })
		expect(progress.at(-1)).toEqual({ completed: 5, pending: 0 })
	})

	it('cancels queued refreshes and passes the abort signal to active work', async () => {
		const controller = new AbortController()
		const started: string[] = []
		let release: (() => void) | undefined
		const gate = new Promise<void>((resolve) => {
			release = resolve
		})
		const work = runSubscriptionRefreshQueue(
			subscriptions,
			async (subscription, { signal }) => {
				started.push(subscription.id)
				await gate
				expect(signal.aborted).toBe(true)
			},
			{ signal: controller.signal, wait: 0 },
		)

		await vi.waitFor(() => expect(started).toHaveLength(2))
		controller.abort()
		release?.()

		await expect(work).rejects.toMatchObject({ name: 'AbortError' })
		expect(started).toEqual(['subscription-0', 'subscription-1'])
	})
})
