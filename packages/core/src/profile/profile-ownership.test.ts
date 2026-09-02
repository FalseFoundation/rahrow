import { describe, expect, it } from 'vitest'

import type { ConnectionProfile } from './connection-profile.ts'
import { partitionProfilesByOwnership } from './profile-ownership.ts'

const profile = (id: string, subscriptionId?: string): ConnectionProfile => ({
	id,
	protocol: 'trojan',
	endpoint: { host: `${id}.example.com`, port: 443 },
	authentication: { password: 'secret' },
	metadata: subscriptionId
		? { source: 'subscription', subscriptionId }
		: { source: 'manual' },
})

describe('profile ownership', () => {
	it('keeps subscription profiles out of the standalone collection', () => {
		const result = partitionProfilesByOwnership([
			profile('local'),
			profile('remote-a', 'source-a'),
			profile('remote-b', 'source-a'),
			profile('remote-c', 'source-b'),
		])

		expect(result.standalone.map(({ id }) => id)).toEqual(['local'])
		expect(result.bySubscription.get('source-a')?.map(({ id }) => id)).toEqual([
			'remote-a',
			'remote-b',
		])
		expect(result.bySubscription.get('source-b')?.map(({ id }) => id)).toEqual([
			'remote-c',
		])
	})
})
