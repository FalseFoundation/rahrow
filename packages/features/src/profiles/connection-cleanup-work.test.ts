import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type { Subscription } from '@rahrow/core/subscription/subscription-import.ts'
import { describe, expect, it } from 'vitest'
import {
	type ConnectionCleanupPacingPolicy,
	scanConnectionsForCleanup,
} from './connection-cleanup-work.ts'

const profile = (id: string): ConnectionProfile => ({
	id,
	protocol: 'vmess',
	endpoint: { host: `${id}.example`, port: 443 },
	metadata: { source: 'manual' },
})

const noWaitPolicy: ConnectionCleanupPacingPolicy = {
	profileConcurrency: 2,
	profileWait: 0,
	subscriptionConcurrency: 1,
	subscriptionWait: 0,
	subscriptionTimeoutMs: 20,
}

describe('connection cleanup work', () => {
	it('bounds profile work to two and subscription work to one', async () => {
		let activeProfiles = 0
		let maxProfiles = 0
		let activeSubscriptions = 0
		let maxSubscriptions = 0
		const profiles = Array.from({ length: 5 }, (_, index) =>
			profile(`profile-${index}`),
		)
		const subscriptions: Subscription[] = Array.from(
			{ length: 3 },
			(_, index) => ({
				id: `subscription-${index}`,
				url: `https://subscription-${index}.example`,
			}),
		)

		const report = await scanConnectionsForCleanup({
			profiles,
			subscriptions,
			engine: {
				test: async (target) => {
					activeProfiles += 1
					maxProfiles = Math.max(maxProfiles, activeProfiles)
					await Promise.resolve()
					activeProfiles -= 1
					return {
						profileId: target.id,
						reachable: true,
						latencyMs: 12,
						checkedAt: '2026-09-01T00:00:00.000Z',
					}
				},
			},
			subscriptionFetcher: {
				fetch: async () => {
					activeSubscriptions += 1
					maxSubscriptions = Math.max(maxSubscriptions, activeSubscriptions)
					await Promise.resolve()
					activeSubscriptions -= 1
					return 'profile data'
				},
			},
			signal: new AbortController().signal,
			pacing: noWaitPolicy,
		})

		expect(maxProfiles).toBeLessThanOrEqual(2)
		expect(maxSubscriptions).toBe(1)
		expect(report.keptProfileCount).toBe(5)
		expect(report.keptSubscriptionCount).toBe(3)
	})

	it('marks rejected and timed-out probes for removal', async () => {
		const report = await scanConnectionsForCleanup({
			profiles: [profile('failed')],
			subscriptions: [{ id: 'timeout-source', url: 'https://timeout.example' }],
			engine: { test: async () => Promise.reject(new Error('offline')) },
			subscriptionFetcher: {
				fetch: (_subscription, options) =>
					new Promise((_resolve, reject) => {
						options?.signal?.addEventListener('abort', () =>
							reject(options.signal?.reason),
						)
					}),
			},
			signal: new AbortController().signal,
			pacing: { ...noWaitPolicy, subscriptionTimeoutMs: 1 },
		})

		expect([...report.removeProfileIds]).toEqual(['failed'])
		expect([...report.removeSubscriptionIds]).toEqual(['timeout-source'])
	})
})
