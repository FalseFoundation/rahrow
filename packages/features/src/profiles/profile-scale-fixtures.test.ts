import { describe, expect, it } from 'vitest'
import { deriveConnectionLibrary } from './profile-library-model.ts'
import {
	createProfileScaleFixture,
	createProviderRealisticScaleFixture,
	PROFILE_SCALE_COUNTS,
	PROVIDER_REALISTIC_PROFILE_COUNT,
} from './profile-scale-fixtures.ts'

describe('deterministic profile scale fixtures', () => {
	it.each([...PROFILE_SCALE_COUNTS, PROVIDER_REALISTIC_PROFILE_COUNT])(
		'creates %i stable, unique, provider-partitioned profiles',
		(count) => {
			const first = createProfileScaleFixture(count)
			const second = createProfileScaleFixture(count)

			expect(first).toEqual(second)
			expect(first).toHaveLength(count)
			expect(new Set(first.map(({ id }) => id)).size).toBe(count)
			expect(first[0]?.endpoint.host).toBe('edge-00000.fixture.invalid')
			expect(first.at(-1)?.id).toBe(
				`fixture-${String(count - 1).padStart(5, '0')}`,
			)
		},
	)

	it('derives a 10k search and ownership view without mutating fixture order', () => {
		const profiles = createProfileScaleFixture(10_000)
		const originalFirst = profiles[0]
		const result = deriveConnectionLibrary({
			profiles,
			query: 'edge-09999',
			sort: 'name',
			speedTests: {},
			subscriptions: Array.from({ length: 7 }, (_, index) => ({
				id: `provider-${index + 1}`,
				url: `https://provider-${index + 1}.fixture.invalid`,
			})),
		})

		expect(result.visibleProfiles.map(({ id }) => id)).toEqual(['fixture-09999'])
		expect(result.orphanedSubscriptionIds).toEqual([])
		expect(profiles[0]).toBe(originalFirst)
	})

	it('models a provider-shaped collection with deterministic uneven ownership', () => {
		const fixture = createProviderRealisticScaleFixture()

		expect(fixture.profiles).toHaveLength(PROVIDER_REALISTIC_PROFILE_COUNT)
		expect(fixture.subscriptions.map(({ id }) => id)).toEqual([
			'provider-primary',
			'provider-secondary',
			'provider-small',
		])
		expect(
			fixture.profiles.reduce<Record<string, number>>((counts, profile) => {
				const owner = profile.metadata?.subscriptionId ?? 'standalone'
				counts[owner] = (counts[owner] ?? 0) + 1
				return counts
			}, {}),
		).toEqual({
			'provider-primary': 1_600,
			'provider-secondary': 600,
			'provider-small': 160,
			standalone: 24,
		})
	})
})
