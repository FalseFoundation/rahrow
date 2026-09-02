import type { LogRecord } from '@rahrow/core/logging/log-record.ts'
import { describe, expect, it } from 'vitest'

import {
	filterLogRecords,
	formatLogExport,
	uniqueLogModules,
} from './logs-model.ts'

const records: readonly LogRecord[] = [
	{
		id: '1',
		time: 1,
		level: 'debug',
		msg: 'Starting engine',
		module: 'xray',
		bindings: { name: 'rahrow' },
	},
	{
		id: '2',
		time: 2,
		level: 'info',
		msg: 'Connected',
		module: 'connection',
		bindings: { profileId: 'p1' },
	},
	{
		id: '3',
		time: 3,
		level: 'error',
		msg: 'Xray start failed',
		module: 'xray',
		bindings: { err: 'boom' },
	},
]

describe('logs model', () => {
	it('filters records by minimum level, module, and query', () => {
		expect(
			filterLogRecords(records, {
				minLevel: 'info',
				query: '',
			}).map((record) => record.id),
		).toEqual(['2', '3'])

		expect(
			filterLogRecords(records, {
				minLevel: 'trace',
				query: 'fail',
				module: 'xray',
			}).map((record) => record.msg),
		).toEqual(['Xray start failed'])
	})

	it('lists unique modules and formats an export transcript', () => {
		expect(uniqueLogModules(records)).toEqual(['connection', 'xray'])
		expect(formatLogExport(records.slice(1, 2))).toBe(
			'1970-01-01T00:00:00.002Z INFO connection Connected',
		)
	})
})
