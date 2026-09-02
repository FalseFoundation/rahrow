import { describe, expect, it } from 'vitest'

import {
	compareLatencyResults,
	presentLatency,
} from './latency-presentation.ts'

describe('latency presentation', () => {
	it.each([
		[0, { kind: 'timeout', label: 'Timeout', value: null }],
		[42, { kind: 'measured', label: '42 ms', value: 42 }],
		[12.5, { kind: 'measured', label: '12.5 ms', value: 12.5 }],
		[-1, { kind: 'unavailable', label: 'Unavailable', value: null }],
		[Number.NaN, { kind: 'unavailable', label: 'Unavailable', value: null }],
		[
			Number.POSITIVE_INFINITY,
			{ kind: 'unavailable', label: 'Unavailable', value: null },
		],
		[undefined, { kind: 'unavailable', label: 'Unavailable', value: null }],
	] as const)('normalizes a %s millisecond value', (latencyMs, expected) => {
		expect(presentLatency({ reachable: true, latencyMs })).toEqual(expected)
	})

	it('keeps canceled, unreachable, timeout, and error outcomes distinct', () => {
		expect(presentLatency()).toEqual({
			kind: 'unavailable',
			label: 'Unavailable',
			value: null,
		})
		expect(presentLatency({ reachable: false, error: 'Probe canceled' })).toEqual(
			{
				kind: 'canceled',
				label: 'Canceled',
				value: null,
			},
		)
		expect(presentLatency({ reachable: false })).toEqual({
			kind: 'unreachable',
			label: 'Unreachable',
			value: null,
		})
		expect(
			presentLatency({ reachable: false, error: 'TCP probe timed out after 5s' }),
		).toEqual({ kind: 'timeout', label: 'Timeout', value: null })
		expect(
			presentLatency({ reachable: false, error: 'Connection refused' }),
		).toEqual({ kind: 'error', label: 'Ping failed', value: null })
	})

	it('sorts measured values before timeout, failures, and untested values', () => {
		const sorted = [
			undefined,
			{ reachable: false },
			{ reachable: true, latencyMs: 0 },
			{ reachable: true, latencyMs: 40 },
			{ reachable: true, latencyMs: 8 },
		].sort(compareLatencyResults)

		expect(sorted.map((value) => presentLatency(value).kind)).toEqual([
			'measured',
			'measured',
			'timeout',
			'unreachable',
			'unavailable',
		])
		expect(presentLatency(sorted[0]).value).toBe(8)
	})
})
