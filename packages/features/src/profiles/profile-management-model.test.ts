import { describe, expect, it } from 'vitest'

import { formatLatencyResult } from './profile-management-model.ts'

describe('formatLatencyResult', () => {
	it('describes the result as latency rather than speed', () => {
		expect(formatLatencyResult({ latencyMs: 42 })).toBe('Latency test: 42 ms')
		expect(formatLatencyResult({})).toBe('Latency test: Unavailable')
		expect(formatLatencyResult({ latencyMs: 0 })).toBe('Latency test: Timeout')
	})
})
