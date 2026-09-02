import { describe, expect, it } from 'vitest'
import {
	isProfileProtectedByLock,
	partitionProfilesByLock,
	protectedSubscriptionIds,
} from './connection-lock-policy.ts'
import type { ConnectionProfile } from './connection-profile.ts'

const profile = (id: string, subscriptionId?: string): ConnectionProfile => ({
	id,
	protocol: 'vmess',
	endpoint: { host: `${id}.example`, port: 443 },
	metadata: subscriptionId
		? { source: 'subscription', subscriptionId }
		: { source: 'manual' },
})

describe('connection lock policy', () => {
	it('treats a locked subscription as protection for the complete aggregate', () => {
		const subscriptions = [
			{ id: 'locked', url: 'https://locked.example', locked: true },
			{ id: 'open', url: 'https://open.example' },
		]
		const lockedIds = protectedSubscriptionIds(subscriptions)

		expect(isProfileProtectedByLock(profile('child', 'locked'), lockedIds)).toBe(
			true,
		)
		expect(
			isProfileProtectedByLock(profile('open-child', 'open'), lockedIds),
		).toBe(false)
		expect(
			isProfileProtectedByLock(profile('orphan', 'missing'), lockedIds),
		).toBe(false)
		expect(isProfileProtectedByLock(profile('standalone'), lockedIds)).toBe(false)
	})

	it('partitions mixed destructive targets without losing their immutable ids', () => {
		const result = partitionProfilesByLock(
			[
				profile('locked-child', 'locked'),
				profile('open-child', 'open'),
				profile('standalone'),
			],
			new Set(['locked']),
		)

		expect(result.removable.map(({ id }) => id)).toEqual([
			'open-child',
			'standalone',
		])
		expect(result.skippedLocked.map(({ id }) => id)).toEqual(['locked-child'])
	})
})
