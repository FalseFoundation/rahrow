import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type { Subscription } from '@rahrow/core/subscription/subscription-import.ts'
import { describe, expect, it } from 'vitest'
import {
	buildConnectionCleanupReport,
	buildConnectionCleanupReportPaced,
	cleanupProfileProbeResult,
} from './connection-cleanup-model.ts'

const profile = (id: string, subscriptionId?: string): ConnectionProfile => ({
	id,
	protocol: 'vmess',
	endpoint: { host: `${id}.example`, port: 443 },
	metadata: subscriptionId
		? { source: 'subscription', subscriptionId }
		: { source: 'manual' },
})

describe('connection cleanup model', () => {
	it('keeps only measured profile probes', () => {
		expect(
			cleanupProfileProbeResult({
				profileId: 'reachable',
				reachable: true,
				latencyMs: 18,
				checkedAt: '2026-09-01T00:00:00.000Z',
			}),
		).toEqual({ id: 'reachable', status: 'passed' })
		expect(
			cleanupProfileProbeResult({
				profileId: 'timeout',
				reachable: false,
				error: 'Timed out',
				checkedAt: '2026-09-01T00:00:00.000Z',
			}),
		).toEqual({ id: 'timeout', status: 'timeout' })
	})

	it('preserves locked subscription aggregates and reports every skipped failed item', () => {
		const profiles = [
			profile('standalone'),
			profile('owned-by-failed', 'failed-source'),
			profile('owned-by-locked', 'locked-source'),
			profile('orphaned', 'missing-source'),
		]
		const subscriptions: Subscription[] = [
			{ id: 'failed-source', url: 'https://failed.example' },
			{ id: 'locked-source', url: 'https://locked.example', locked: true },
		]
		const report = buildConnectionCleanupReport({
			profiles,
			subscriptions,
			profileResults: profiles.map(({ id }) => ({
				id,
				status: id === 'standalone' ? ('passed' as const) : ('failed' as const),
			})),
			subscriptionResults: subscriptions.map(({ id }) => ({
				id,
				status: 'failed',
			})),
		})

		expect([...report.removeSubscriptionIds]).toEqual(['failed-source'])
		expect([...report.removeProfileIds]).toEqual(['owned-by-failed', 'orphaned'])
		expect(report.keptProfileCount).toBe(2)
		expect(report.lockedFailedSubscriptionCount).toBe(1)
		expect(report.lockedFailedProfileCount).toBe(1)
		expect(report.skippedLockedCount).toBe(2)
	})

	it('keeps paced large-report derivation equivalent to the pure model', async () => {
		const profiles = Array.from({ length: 300 }, (_, index) =>
			profile(`profile-${index}`, index % 3 === 0 ? 'failed-source' : undefined),
		)
		const input = {
			profiles,
			subscriptions: [
				{ id: 'failed-source', url: 'https://failed.example' },
			] satisfies Subscription[],
			profileResults: profiles.map(({ id }) => ({
				id,
				status: 'passed' as const,
			})),
			subscriptionResults: [{ id: 'failed-source', status: 'failed' as const }],
		}

		const expected = buildConnectionCleanupReport(input)
		const actual = await buildConnectionCleanupReportPaced(input)

		expect(actual).toEqual(expected)
	})
})
