import type { Subscription } from '@rahrow/core/subscription/subscription-import.ts'
import { describe, expect, it } from 'vitest'

import {
	isSubscriptionExpired,
	isSubscriptionStale,
	subscriptionsNeedingRefresh,
} from './subscription-hygiene.ts'

const base: Subscription = {
	id: 'sub-1',
	url: 'https://example.com/sub',
	name: 'Example',
}

describe('subscription hygiene', () => {
	it('detects expired subscription metadata', () => {
		expect(
			isSubscriptionExpired(
				{
					...base,
					metadata: {
						usage: { expiresAt: '2020-01-01T00:00:00.000Z' },
					},
				},
				Date.parse('2026-01-01T00:00:00.000Z'),
			),
		).toBe(true)
		expect(
			isSubscriptionExpired(
				{
					...base,
					metadata: {
						usage: { expiresAt: '2030-01-01T00:00:00.000Z' },
					},
				},
				Date.parse('2026-01-01T00:00:00.000Z'),
			),
		).toBe(false)
	})

	it('treats missing or old updatedAt as stale and skips expired sources', () => {
		const now = Date.parse('2026-01-02T00:00:00.000Z')
		expect(isSubscriptionStale(base, now)).toBe(true)
		expect(
			isSubscriptionStale(
				{ ...base, updatedAt: '2026-01-01T12:00:00.000Z' },
				now,
			),
		).toBe(false)
		expect(
			subscriptionsNeedingRefresh(
				[
					base,
					{
						...base,
						id: 'expired',
						updatedAt: '2020-01-01T00:00:00.000Z',
						metadata: {
							usage: { expiresAt: '2020-06-01T00:00:00.000Z' },
						},
					},
					{
						...base,
						id: 'fresh',
						updatedAt: '2026-01-01T18:00:00.000Z',
					},
				],
				now,
			).map((item) => item.id),
		).toEqual(['sub-1'])
	})
})
