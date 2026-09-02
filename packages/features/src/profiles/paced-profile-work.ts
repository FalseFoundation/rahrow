import { AsyncQueuer } from '@tanstack/pacer'

export interface AsyncQueueOptions {
	readonly concurrency?: number
	readonly wait?: number
	readonly signal?: AbortSignal
	readonly progressBatchSize?: number
	readonly onProgress?: (progress: AsyncQueueProgress) => void
}

export interface AsyncQueueProgress {
	readonly completed: number
	readonly pending: number
	readonly total: number
	readonly index?: number
	readonly status: 'pending' | 'success' | 'error' | 'canceled'
}

export interface AsyncQueueWorkerContext {
	readonly index: number
	readonly signal: AbortSignal
}

export interface PacedBatchOptions {
	readonly batchSize?: number
	readonly wait?: number
	readonly signal?: AbortSignal
}

/**
 * Runs every accepted item while bounding concurrent work. Results retain the
 * input order even when workers settle out of order.
 */
export function runAsyncQueue<TItem, TResult>(
	items: readonly TItem[],
	worker: (item: TItem, context: AsyncQueueWorkerContext) => Promise<TResult>,
	{
		concurrency = 1,
		wait = 0,
		signal,
		progressBatchSize = 1,
		onProgress,
	}: AsyncQueueOptions = {},
): Promise<readonly TResult[]> {
	if (items.length === 0) return Promise.resolve([])

	return new Promise((resolve, reject) => {
		const results = new Array<TResult>(items.length)
		let settled = 0
		let firstError: unknown
		let finished = false
		const controller = new AbortController()
		const batchSize = Math.max(1, Math.floor(progressBatchSize))
		const itemStatus = new Map<number, 'success' | 'error'>()
		const abortError = () => new DOMException('Operation canceled', 'AbortError')
		const report = (status: AsyncQueueProgress['status'], index?: number) => {
			if (!onProgress) return
			if (status !== 'pending' && status !== 'canceled') {
				if (settled % batchSize !== 0 && settled !== items.length) return
			}
			onProgress({
				completed: settled,
				pending: Math.max(0, items.length - settled),
				total: items.length,
				index,
				status,
			})
		}
		const queue = new AsyncQueuer(
			async ({
				item,
				index,
			}: {
				readonly item: TItem
				readonly index: number
			}) => {
				if (controller.signal.aborted) throw abortError()
				results[index] = await worker(item, {
					index,
					signal: controller.signal,
				})
				if (controller.signal.aborted) throw abortError()
			},
			{
				concurrency: Math.max(1, concurrency),
				started: false,
				wait: Math.max(0, wait),
				throwOnError: false,
				onSuccess: (_result, queuedItem) => {
					itemStatus.set(queuedItem.index, 'success')
				},
				onError: (error, queuedItem) => {
					itemStatus.set(queuedItem.index, 'error')
					firstError ??= error
				},
				onSettled: (queuedItem) => {
					if (finished) return
					settled += 1
					report(itemStatus.get(queuedItem.index) ?? 'error', queuedItem.index)
					if (settled !== items.length) return
					finished = true
					queue.stop()
					signal?.removeEventListener('abort', cancel)
					if (firstError !== undefined) reject(firstError)
					else resolve(results)
				},
			},
		)
		const cancel = () => {
			if (finished) return
			finished = true
			controller.abort()
			queue.stop()
			queue.clear()
			queue.abort()
			report('canceled')
			reject(abortError())
		}

		if (signal?.aborted) {
			cancel()
			return
		}
		signal?.addEventListener('abort', cancel, { once: true })
		report('pending')

		items.forEach((item, index) => {
			queue.addItem({ item, index }, undefined, false)
		})
		queue.start()
	})
}

/**
 * Splits already-available collection work into sequential Pacer queue items so
 * large synchronous transforms release the renderer between bounded batches.
 */
export function runInPacedBatches<TItem, TResult>(
	items: readonly TItem[],
	worker: (
		batch: readonly TItem[],
		context: AsyncQueueWorkerContext,
	) => TResult | Promise<TResult>,
	{ batchSize = 128, wait = 1, signal }: PacedBatchOptions = {},
): Promise<readonly TResult[]> {
	const safeBatchSize = Math.max(1, Math.floor(batchSize))
	const batchCount = Math.ceil(items.length / safeBatchSize)
	const batches = Array.from({ length: batchCount }, (_, index) => index)

	return runAsyncQueue(
		batches,
		(index, context) => {
			const start = index * safeBatchSize
			return Promise.resolve(
				worker(items.slice(start, start + safeBatchSize), context),
			)
		},
		{ concurrency: 1, wait, signal },
	)
}
