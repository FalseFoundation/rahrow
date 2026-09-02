import { describe, expect, it } from 'vitest'

import { createLogBuffer } from './log-buffer.ts'

describe('LogBuffer', () => {
	it('appends records, notifies subscribers, and drops the oldest when full', () => {
		const buffer = createLogBuffer({ capacity: 2 })
		const lengths: number[] = []
		const unsubscribe = buffer.subscribe(() => {
			lengths.push(buffer.records().length)
		})

		buffer.write({
			time: 1,
			level: 'info',
			msg: 'first',
			bindings: { module: 'connection' },
		})
		buffer.write({
			time: 2,
			level: 'warn',
			msg: 'second',
			bindings: { module: 'xray' },
		})
		buffer.write({
			time: 3,
			level: 'error',
			msg: 'third',
			bindings: { module: 'xray' },
		})

		expect(buffer.records().map((record) => record.msg)).toEqual([
			'second',
			'third',
		])
		expect(buffer.records().map((record) => record.id)).toEqual([
			'log-2',
			'log-3',
		])
		expect(lengths).toEqual([1, 2, 2])

		buffer.clear()
		expect(buffer.records()).toEqual([])
		expect(lengths).toEqual([1, 2, 2, 0])

		unsubscribe()
		buffer.write({
			time: 4,
			level: 'info',
			msg: 'ignored',
			bindings: {},
		})
		expect(lengths).toEqual([1, 2, 2, 0])
	})
})
