import { describe, expect, it, vi } from 'vitest'
import { runAsyncQueue, runInPacedBatches } from './paced-profile-work.ts'

describe('runAsyncQueue', () => {
	it('bounds concurrency and keeps result order', async () => {
		let active = 0
		let peak = 0
		const results = await runAsyncQueue(
			[3, 1, 2, 0],
			async (value) => {
				active += 1
				peak = Math.max(peak, active)
				await new Promise((resolve) => setTimeout(resolve, value))
				active -= 1
				return value * 2
			},
			{ concurrency: 2 },
		)

		expect(peak).toBe(2)
		expect(results).toEqual([6, 2, 4, 0])
	})

	it('waits for accepted work before rejecting the first error', async () => {
		const visited: number[] = []
		await expect(
			runAsyncQueue(
				[1, 2, 3],
				async (value) => {
					visited.push(value)
					if (value === 2) throw new Error('failed')
					return value
				},
				{ concurrency: 2 },
			),
		).rejects.toThrow('failed')
		expect(visited.sort()).toEqual([1, 2, 3])
	})

	it('reports batched pending progress while retaining per-batch ordering', async () => {
		const progress: Array<{
			completed: number
			pending: number
			status: string
		}> = []
		await runAsyncQueue([0, 1, 2, 3, 4], async (value) => value, {
			concurrency: 2,
			progressBatchSize: 2,
			onProgress: (event) => progress.push(event),
		})

		expect(
			progress.map(({ completed, pending, status }) => ({
				completed,
				pending,
				status,
			})),
		).toEqual([
			{ completed: 0, pending: 5, status: 'pending' },
			{ completed: 2, pending: 3, status: 'success' },
			{ completed: 4, pending: 1, status: 'success' },
			{ completed: 5, pending: 0, status: 'success' },
		])
	})

	it('cancels queued work, exposes an abort signal, and starts no new items', async () => {
		const controller = new AbortController()
		const started: number[] = []
		const progress: string[] = []
		let release: (() => void) | undefined
		const gate = new Promise<void>((resolve) => {
			release = resolve
		})
		const work = runAsyncQueue(
			[0, 1, 2, 3],
			async (value, context) => {
				started.push(value)
				await gate
				expect(context.signal.aborted).toBe(true)
				return value
			},
			{
				concurrency: 2,
				signal: controller.signal,
				onProgress: ({ status }) => progress.push(status),
			},
		)

		await vi.waitFor(() => expect(started).toHaveLength(2))
		controller.abort()
		release?.()
		await expect(work).rejects.toMatchObject({ name: 'AbortError' })
		expect(started).toEqual([0, 1])
		expect(progress).toEqual(['pending', 'canceled'])
	})
})

describe('runInPacedBatches', () => {
	it('bounds synchronous collection work and preserves batch order', async () => {
		const batchSizes: number[] = []
		const results = await runInPacedBatches(
			Array.from({ length: 10 }, (_, index) => index),
			(batch) => {
				batchSizes.push(batch.length)
				return batch.map((value) => value * 2)
			},
			{ batchSize: 3 },
		)

		expect(batchSizes).toEqual([3, 3, 3, 1])
		expect(results.flat()).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18])
	})
})
