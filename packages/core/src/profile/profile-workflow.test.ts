import { describe, expect, it } from 'vitest'
import { ProtocolRegistry } from '../protocol/connection-protocol.ts'
import { JsonProfileStore, MemoryDocumentStore } from '../storage/json-store.ts'
import type { ConnectionProfile } from './connection-profile.ts'
import {
	duplicateProfile,
	importProfilesToStore,
	removeSubscriptionProfiles,
	renameProfile,
	replaceSubscriptionProfiles,
	upsertProfileSubscriptionDraft,
} from './profile-workflow.ts'

const profile: ConnectionProfile = {
	id: 'profile-1',
	protocol: 'vless',
	endpoint: {
		host: 'example.com',
		port: 443,
	},
	authentication: {
		id: '11111111-1111-4111-8111-111111111111',
	},
	metadata: {
		name: 'Primary',
		source: 'manual',
	},
}

describe('profile workflow helpers', () => {
	it('renames profiles without mutating protocol settings', () => {
		const renamed = renameProfile(profile, '  Edge  ')

		expect(renamed).toEqual({
			...profile,
			metadata: {
				...profile.metadata,
				name: 'Edge',
			},
		})
	})

	it('duplicates profiles with a stable copy id and display name', () => {
		const duplicated = duplicateProfile(profile, { suffix: 2 })

		expect(duplicated).toMatchObject({
			id: 'profile-1:copy-2',
			metadata: {
				name: 'Primary copy',
			},
		})
		expect(duplicated.endpoint).toEqual(profile.endpoint)
	})

	it('imports parsed profiles into a profile store', async () => {
		const store = new JsonProfileStore(new MemoryDocumentStore())
		const result = await importProfilesToStore(
			{
				value:
					'vless://11111111-1111-4111-8111-111111111111@example.com:443#Primary',
				source: 'manual',
			},
			store,
			new ProtocolRegistry(),
		)

		expect(result.profiles).toHaveLength(1)
		await expect(store.list()).resolves.toHaveLength(1)
	})

	it('imports valid profiles and reports malformed entries', async () => {
		const store = new JsonProfileStore(new MemoryDocumentStore())
		const result = await importProfilesToStore(
			{
				value: [
					'vless://11111111-1111-4111-8111-111111111111@example.com:443#Primary',
					'vless://not-a-uuid@example.com:443',
				].join('\n'),
				source: 'subscription',
			},
			store,
			new ProtocolRegistry(),
		)

		expect(result.profiles).toHaveLength(1)
		expect(result.issues).toEqual([
			expect.objectContaining({
				index: 1,
				source: 'subscription',
			}),
		])
		await expect(store.list()).resolves.toHaveLength(1)
	})

	it('normalizes and replaces subscription drafts by id', () => {
		const subscriptions = upsertProfileSubscriptionDraft(
			[
				{
					id: 'main',
					url: 'https://old.example/sub.txt',
					content: '',
				},
			],
			{
				id: ' main ',
				url: ' https://new.example/sub.txt ',
				content: 'vless://example',
			},
		)

		expect(subscriptions).toEqual([
			{
				id: 'main',
				url: 'https://new.example/sub.txt',
				content: 'vless://example',
			},
		])
	})

	it('atomically replaces only profiles owned by one subscription', async () => {
		const store = new JsonProfileStore(new MemoryDocumentStore())
		await store.replaceAll([
			{ ...profile, id: 'manual' },
			{
				...profile,
				id: 'old-a',
				metadata: { source: 'subscription', subscriptionId: 'sub-a' },
			},
			{
				...profile,
				id: 'old-b',
				metadata: { source: 'subscription', subscriptionId: 'sub-b' },
			},
		])

		await replaceSubscriptionProfiles(store, 'sub-a', [
			{ ...profile, id: 'new-a' },
		])

		expect((await store.list()).map((item) => item.id)).toEqual([
			'manual',
			'new-a',
			'old-b',
		])
	})

	it('removes only profiles owned by a deleted subscription', async () => {
		const store = new JsonProfileStore(new MemoryDocumentStore())
		await store.replaceAll([
			{ ...profile, id: 'manual' },
			{
				...profile,
				id: 'owned-a',
				metadata: { source: 'subscription', subscriptionId: 'sub-a' },
			},
			{
				...profile,
				id: 'owned-b',
				metadata: { source: 'subscription', subscriptionId: 'sub-b' },
			},
		])

		await removeSubscriptionProfiles(store, 'sub-a')

		expect((await store.list()).map((item) => item.id)).toEqual([
			'manual',
			'owned-b',
		])
	})
})
