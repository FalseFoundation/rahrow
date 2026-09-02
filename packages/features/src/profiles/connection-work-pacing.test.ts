import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { describe, expect, it, vi } from 'vitest'
import {
	countSubscriptionProfilesPaced,
	haveSameRecordsPaced,
	removeProfilesPaced,
	serializeProfilesPaced,
} from './connection-work-pacing.ts'

const profiles = Array.from({ length: 513 }, (_, index) => ({
	id: `profile-${index}`,
	protocol: 'vmess' as const,
	endpoint: { host: `${index}.example`, port: 443 },
	metadata: {
		source: 'subscription' as const,
		subscriptionId: index % 2 === 0 ? 'even' : 'odd',
	},
})) satisfies readonly ConnectionProfile[]

describe('large connection work pacing', () => {
	it('serializes large share targets in stable order', async () => {
		const serialize = vi.fn((profile: ConnectionProfile) => profile.id)
		const value = await serializeProfilesPaced(profiles, { serialize })

		expect(value.split('\n')).toHaveLength(profiles.length)
		expect(value.startsWith('profile-0\nprofile-1')).toBe(true)
		expect(value.endsWith('profile-512')).toBe(true)
	})

	it('uses one atomic replacement for bulk deletion', async () => {
		const replaceAll = vi.fn(
			async (_profiles: readonly ConnectionProfile[]) => undefined,
		)
		const remove = vi.fn(async () => undefined)
		const store = {
			list: vi.fn(async () => profiles),
			get: vi.fn(async () => null),
			save: vi.fn(async () => undefined),
			remove,
			replaceAll,
		}

		await removeProfilesPaced(store, profiles.slice(0, 500))

		expect(remove).not.toHaveBeenCalled()
		expect(replaceAll).toHaveBeenCalledOnce()
		expect(replaceAll).toHaveBeenCalledWith(profiles.slice(500))
	})

	it('counts owned profiles without one uninterrupted large scan', async () => {
		await expect(countSubscriptionProfilesPaced(profiles, 'even')).resolves.toBe(
			257,
		)
	})

	it('compares large collection contents without sorting them', async () => {
		await expect(
			haveSameRecordsPaced(profiles, [...profiles].reverse()),
		).resolves.toBe(true)
		await expect(haveSameRecordsPaced(profiles, profiles.slice(1))).resolves.toBe(
			false,
		)
		await expect(
			haveSameRecordsPaced(profiles, [
				{
					...profiles[0],
					endpoint: { host: 'edited.example', port: 443 },
				} as ConnectionProfile,
				...profiles.slice(1),
			]),
		).resolves.toBe(false)
	})
})
