import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type { Subscription } from '@rahrow/core/subscription/subscription-import.ts'

export const PROFILE_SCALE_COUNTS = [100, 1_000, 10_000] as const
export const PROVIDER_REALISTIC_PROFILE_COUNT = 2_384

export interface ProviderRealisticScaleFixture {
	readonly profiles: readonly ConnectionProfile[]
	readonly subscriptions: readonly Subscription[]
}

export function createProfileScaleFixture(
	count: number,
): readonly ConnectionProfile[] {
	return Array.from({ length: count }, (_, index) => {
		const ordinal = String(index).padStart(5, '0')
		const subscriptionIndex = index % 8
		return {
			id: `fixture-${ordinal}`,
			protocol:
				index % 3 === 0 ? 'shadowsocks' : index % 2 === 0 ? 'vless' : 'vmess',
			endpoint: {
				host: `edge-${ordinal}.fixture.invalid`,
				port: 1_000 + (index % 64_000),
			},
			metadata: {
				name: `Fixture connection ${ordinal}`,
				source: subscriptionIndex === 0 ? 'manual' : 'subscription',
				subscriptionId:
					subscriptionIndex === 0 ? undefined : `provider-${subscriptionIndex}`,
			},
		} satisfies ConnectionProfile
	})
}

export function createProviderRealisticScaleFixture(): ProviderRealisticScaleFixture {
	const subscriptions = [
		{
			id: 'provider-primary',
			name: 'Primary provider',
			url: 'https://primary.fixture.invalid/subscription',
		},
		{
			id: 'provider-secondary',
			name: 'Secondary provider',
			url: 'https://secondary.fixture.invalid/subscription',
		},
		{
			id: 'provider-small',
			name: 'Small provider',
			url: 'https://small.fixture.invalid/subscription',
		},
	] satisfies readonly Subscription[]

	const profiles = createProfileScaleFixture(
		PROVIDER_REALISTIC_PROFILE_COUNT,
	).map((profile, index) => {
		const subscriptionId =
			index < 1_600
				? 'provider-primary'
				: index < 2_200
					? 'provider-secondary'
					: index < 2_360
						? 'provider-small'
						: undefined
		return {
			...profile,
			metadata: {
				...profile.metadata,
				source: subscriptionId ? 'subscription' : 'manual',
				subscriptionId,
			},
		} satisfies ConnectionProfile
	})

	return { profiles, subscriptions }
}
