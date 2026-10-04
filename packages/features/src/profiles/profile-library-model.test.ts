import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { describe, expect, it, vi } from 'vitest'
import {
	actionTargetName,
	connectionDrawerCopy,
	deriveConnectionLibrary,
	filterAndSortProfiles,
	removeTitle,
	serializeProfiles,
	shouldVirtualizeProfileList,
	targetProfiles,
} from './profile-library-model.ts'

function profile(
	id: string,
	name: string,
	host: string,
	protocol: ConnectionProfile['protocol'] = 'vmess',
): ConnectionProfile {
	return {
		id,
		protocol,
		endpoint: { host, port: 443 },
		metadata: { name, source: 'manual' },
	}
}

const profiles = [
	profile('zeta', 'Zeta', 'zeta.example'),
	profile('alpha', 'Alpha', 'alpha.example'),
	profile('wire', 'Wire route', 'wire.example', 'shadowsocks'),
]

describe('profile library model', () => {
	it('searches all visible identity fields and supports every sort mode', () => {
		expect(
			filterAndSortProfiles({
				profiles,
				query: 'SHADOWSOCKS',
				sort: 'default',
				speedTests: {},
			}).map(({ id }) => id),
		).toEqual(['wire'])
		expect(
			filterAndSortProfiles({
				profiles,
				query: '',
				sort: 'name',
				speedTests: {},
			}).map(({ id }) => id),
		).toEqual(['alpha', 'wire', 'zeta'])
		expect(
			filterAndSortProfiles({
				profiles,
				query: '',
				sort: 'speed-test',
				speedTests: {
					alpha: { reachable: true, latencyMs: 80 },
					wire: { reachable: true, latencyMs: 20 },
				},
			}).map(({ id }) => id),
		).toEqual(['wire', 'alpha', 'zeta'])
	})

	it('sorts timeouts after positive latency and resolves failure ties by name', () => {
		expect(
			filterAndSortProfiles({
				profiles,
				query: '',
				sort: 'speed-test',
				speedTests: {
					alpha: { reachable: true, latencyMs: 0 },
					wire: { reachable: false },
					zeta: { reachable: true, latencyMs: 1 },
				},
			}).map(({ id }) => id),
		).toEqual(['zeta', 'alpha', 'wire'])
	})

	it('can hide connections that failed a probe', () => {
		expect(
			filterAndSortProfiles({
				profiles,
				query: '',
				sort: 'name',
				hideUnreachable: true,
				speedTests: {
					alpha: { reachable: true, latencyMs: 40 },
					wire: { reachable: false },
				},
			}).map(({ id }) => id),
		).toEqual(['alpha', 'zeta'])
	})

	it('locks the virtualization threshold and destructive target names', () => {
		const firstProfile = profiles.at(0)
		if (!firstProfile) throw new Error('Expected a profile fixture')

		expect(shouldVirtualizeProfileList(12)).toBe(false)
		expect(shouldVirtualizeProfileList(13)).toBe(true)
		expect(removeTitle({ kind: 'profile', profile: firstProfile })).toBe(
			'Remove this connection?',
		)
		expect(removeTitle({ kind: 'local', profiles })).toBe(
			'Remove these connections?',
		)
	})

	it('serializes large action targets in stable display order', () => {
		const serialize = vi.fn((value: ConnectionProfile) => value.id)
		expect(serializeProfiles(profiles, { serialize })).toBe('zeta\nalpha\nwire')
		expect(serialize).toHaveBeenCalledTimes(3)
	})

	it('derives ownership groups, orphans, and active disclosure keys together', () => {
		const owned = {
			...profiles[0],
			metadata: { ...profiles[0]?.metadata, subscriptionId: 'known' },
		} as ConnectionProfile
		const orphaned = {
			...profiles[1],
			metadata: { ...profiles[1]?.metadata, subscriptionId: 'missing' },
		} as ConnectionProfile
		const result = deriveConnectionLibrary({
			profiles: [owned, orphaned, profiles[2] as ConnectionProfile],
			query: '',
			sort: 'default',
			speedTests: {},
			subscriptions: [{ id: 'known', url: 'https://example.com' }],
		})

		expect(result.ownership.standalone.map(({ id }) => id)).toEqual(['wire'])
		expect(result.allOwnership.bySubscription.get('known')).toEqual([owned])
		expect(result.orphanedSubscriptionIds).toEqual(['missing'])
		expect([...result.activeGroupKeys]).toEqual([
			'standalone',
			'subscription:known',
			'orphaned:missing',
		])
	})

	it('owns action targeting and drawer copy rules', () => {
		const firstProfile = profiles[0] as ConnectionProfile
		const profileTarget = { kind: 'profile', profile: firstProfile } as const
		expect(targetProfiles(profileTarget)).toEqual([firstProfile])
		expect(actionTargetName(profileTarget)).toBe('Zeta')
		expect(connectionDrawerCopy('actions', profileTarget)).toEqual({
			title: 'Zeta',
		})
		expect(connectionDrawerCopy('sort', profileTarget)).toEqual({
			title: 'Sort connections',
		})
		expect(connectionDrawerCopy('import', profileTarget).description).toBe(
			'Add a connection from a URL, QR code, or manual protocol fields.',
		)
	})
})
