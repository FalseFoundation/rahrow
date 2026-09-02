import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'

export const PROFILE_SCALE_COUNTS = [100, 1_000, 10_000] as const
export const PROVIDER_REALISTIC_PROFILE_COUNT = 2_384

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
