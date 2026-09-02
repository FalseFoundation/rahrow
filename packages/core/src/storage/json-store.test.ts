import { describe, expect, it } from 'vitest'

import { ProfileError } from '../errors.ts'
import type { ConnectionProfile } from '../profile/connection-profile.ts'
import {
	JsonProfileStore,
	JsonSettingsStore,
	MemoryDocumentStore,
	type StringDocumentStore,
} from './json-store.ts'

const profile: ConnectionProfile = {
	id: 'profile-2',
	protocol: 'vless',
	endpoint: {
		host: 'example.com',
		port: 443,
	},
	authentication: {
		id: '11111111-1111-4111-8111-111111111111',
	},
}

describe('JsonProfileStore', () => {
	it('saves, lists, gets, and removes validated profiles deterministically', async () => {
		const document = new MemoryDocumentStore()
		const store = new JsonProfileStore(document)

		await store.save(profile)
		await store.save({
			...profile,
			id: 'profile-1',
			endpoint: {
				host: 'a.example.com',
				port: 443,
			},
		})

		await expect(store.list()).resolves.toMatchObject([
			{ id: 'profile-1' },
			{ id: 'profile-2' },
		])
		await expect(store.get('profile-2')).resolves.toMatchObject({
			endpoint: {
				host: 'example.com',
			},
		})
		expect(await document.read()).toMatch(/\n$/)

		await store.remove('profile-1')
		await expect(store.list()).resolves.toMatchObject([{ id: 'profile-2' }])
	})

	it('rejects malformed persisted profile data on read', async () => {
		const store = new JsonProfileStore(
			new MemoryDocumentStore(
				JSON.stringify({
					profiles: [
						{
							id: 'bad',
							protocol: 'vless',
							endpoint: {
								host: 'example.com',
								port: 70000,
							},
						},
					],
				}),
			),
		)

		await expect(store.list()).rejects.toThrow()
	})

	it('raises typed errors for corrupted profile JSON', async () => {
		const store = new JsonProfileStore(new MemoryDocumentStore('{'))

		await expect(store.list()).rejects.toThrow(ProfileError)
	})

	it('rejects duplicate persisted profile ids', async () => {
		const store = new JsonProfileStore(
			new MemoryDocumentStore(
				JSON.stringify({
					profiles: [
						profile,
						{
							...profile,
							endpoint: {
								host: 'duplicate.example.com',
								port: 443,
							},
						},
					],
				}),
			),
		)

		await expect(store.list()).rejects.toThrow(ProfileError)
	})

	it('uses atomic document writes when supported', async () => {
		const document = new AtomicMemoryDocumentStore()
		const store = new JsonProfileStore(document)

		await store.save(profile)

		expect(document.writeCount).toBe(0)
		expect(document.atomicWriteCount).toBe(1)
		await expect(store.list()).resolves.toHaveLength(1)
	})
})

describe('JsonSettingsStore', () => {
	it('applies the persisted product defaults to an empty document', async () => {
		const store = new JsonSettingsStore(new MemoryDocumentStore())

		await expect(store.read()).resolves.toEqual({
			engineId: 'sing-box',
			connectionMode: 'vpn',
		})
	})

	it('round-trips valid settings and rejects invalid persisted values', async () => {
		const document = new MemoryDocumentStore()
		const store = new JsonSettingsStore(document)

		await store.write({
			activeProfileId: 'profile-1',
			engineId: 'xray',
			localPort: 10808,
			routingMode: 'rule',
			language: 'en',
			theme: 'system',
			connectionMode: 'vpn',
			launchAtStartup: true,
			connectionsView: {
				version: 1,
				groupOpen: { standalone: false, 'subscription:main': true },
				query: 'reality',
				sort: 'speed-test',
			},
		})

		await expect(store.read()).resolves.toEqual({
			activeProfileId: 'profile-1',
			engineId: 'xray',
			localPort: 10808,
			routingMode: 'rule',
			language: 'en',
			theme: 'system',
			connectionMode: 'vpn',
			launchAtStartup: true,
			connectionsView: {
				version: 1,
				groupOpen: { standalone: false, 'subscription:main': true },
				query: 'reality',
				sort: 'speed-test',
			},
		})

		const invalid = new JsonSettingsStore(
			new MemoryDocumentStore(
				JSON.stringify({
					settings: {
						activeProfileId: '',
						engineId: 'xray',
						localPort: 70000,
					},
				}),
			),
		)

		await expect(invalid.read()).rejects.toThrow(ProfileError)
	})

	it('recovers malformed or obsolete Connections view preferences', async () => {
		for (const connectionsView of [
			{ version: 0, groupOpen: { standalone: false } },
			{ version: 1, groupOpen: [], query: 42, sort: 'fastest' },
		]) {
			const store = new JsonSettingsStore(
				new MemoryDocumentStore(
					JSON.stringify({
						version: 1,
						settings: {
							engineId: 'sing-box',
							connectionMode: 'vpn',
							connectionsView,
						},
					}),
				),
			)

			await expect(store.read()).resolves.toMatchObject({
				connectionsView: {
					version: 1,
					groupOpen: {},
					query: '',
					sort: 'default',
					recoveredFromInvalid: true,
				},
			})
		}
	})

	it('raises typed errors for corrupted settings JSON', async () => {
		const store = new JsonSettingsStore(new MemoryDocumentStore('{'))

		await expect(store.read()).rejects.toThrow(ProfileError)
	})

	it('uses atomic document writes when supported', async () => {
		const document = new AtomicMemoryDocumentStore()
		const store = new JsonSettingsStore(document)

		await store.write({
			engineId: 'xray',
		})

		expect(document.writeCount).toBe(0)
		expect(document.atomicWriteCount).toBe(1)
		await expect(store.read()).resolves.toEqual({
			engineId: 'xray',
			connectionMode: 'vpn',
		})
	})

	it('writes the current connection mode schema', async () => {
		const document = new MemoryDocumentStore()
		const store = new JsonSettingsStore(document)

		await store.write({ engineId: 'xray' })

		expect(await document.read()).toContain('"connectionMode": "vpn"')
	})
})

class AtomicMemoryDocumentStore implements StringDocumentStore {
	private value: string | null = null
	writeCount = 0
	atomicWriteCount = 0

	async read(): Promise<string | null> {
		return this.value
	}

	async write(value: string): Promise<void> {
		this.writeCount += 1
		this.value = value
	}

	async writeAtomic(value: string): Promise<void> {
		this.atomicWriteCount += 1
		this.value = value
	}
}
