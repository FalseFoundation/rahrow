import { ProfileError } from '@rahrow/core/errors.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import {
	JsonProfileStore,
	JsonSettingsStore,
} from '@rahrow/core/storage/json-store.ts'
import { describe, expect, it } from 'vitest'

import {
	createMobileDocumentStore,
	type KeyValueStore,
	PreferencesDocumentStore,
	WebFallbackDocumentStore,
} from './mobile-document-store.ts'

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

class MemoryKeyValueStore implements KeyValueStore {
	readonly values = new Map<string, string>()

	async get(key: string): Promise<string | null> {
		return this.values.get(key) ?? null
	}

	async set(key: string, value: string): Promise<void> {
		this.values.set(key, value)
	}
}

class MemoryWebStorage implements Pick<Storage, 'getItem' | 'setItem'> {
	private readonly values = new Map<string, string>()

	getItem(key: string): string | null {
		return this.values.get(key) ?? null
	}

	setItem(key: string, value: string): void {
		this.values.set(key, value)
	}
}

describe('PreferencesDocumentStore', () => {
	it('returns null when the preference key is missing', async () => {
		const store = new PreferencesDocumentStore(
			'rahrow.profiles',
			new MemoryKeyValueStore(),
		)

		await expect(store.read()).resolves.toBeNull()
	})

	it('preserves document text across a new store instance', async () => {
		const preferences = new MemoryKeyValueStore()
		const store = new PreferencesDocumentStore('rahrow.profiles', preferences)

		await store.writeAtomic('{"version":1}\n')

		const restarted = new PreferencesDocumentStore('rahrow.profiles', preferences)

		await expect(restarted.read()).resolves.toBe('{"version":1}\n')
	})

	it('lets JsonProfileStore persist profiles across a new store instance', async () => {
		const preferences = new MemoryKeyValueStore()
		const store = new JsonProfileStore(
			new PreferencesDocumentStore('rahrow.profiles', preferences),
		)

		await store.save(profile)

		const restarted = new JsonProfileStore(
			new PreferencesDocumentStore('rahrow.profiles', preferences),
		)

		await expect(restarted.list()).resolves.toEqual([profile])
	})

	it('fails closed when JsonProfileStore reads corrupt JSON', async () => {
		const preferences = new MemoryKeyValueStore()
		await preferences.set('rahrow.profiles', '{')

		const store = new JsonProfileStore(
			new PreferencesDocumentStore('rahrow.profiles', preferences),
		)

		await expect(store.list()).rejects.toThrow(ProfileError)
	})

	it('fails closed when JsonProfileStore reads an invalid profile', async () => {
		const preferences = new MemoryKeyValueStore()
		await preferences.set(
			'rahrow.profiles',
			JSON.stringify({
				profiles: [
					{
						id: 'invalid',
						protocol: 'vless',
						endpoint: {
							host: 'example.com',
							port: 70000,
						},
					},
				],
			}),
		)

		const store = new JsonProfileStore(
			new PreferencesDocumentStore('rahrow.profiles', preferences),
		)

		await expect(store.list()).rejects.toThrow(ProfileError)
	})

	it('lets JsonSettingsStore persist settings across a new store instance', async () => {
		const preferences = new MemoryKeyValueStore()
		const store = new JsonSettingsStore(
			new PreferencesDocumentStore('rahrow.settings', preferences),
		)

		await store.write({
			engineId: 'xray',
			connectionsView: {
				version: 1,
				groupOpen: { standalone: false },
				query: 'work',
				sort: 'name',
			},
		})

		const restarted = new JsonSettingsStore(
			new PreferencesDocumentStore('rahrow.settings', preferences),
		)

		await expect(restarted.read()).resolves.toEqual({
			engineId: 'xray',
			connectionMode: 'vpn',
			connectionsView: {
				version: 1,
				groupOpen: { standalone: false },
				query: 'work',
				sort: 'name',
			},
		})
	})
})

describe('WebFallbackDocumentStore', () => {
	it('round-trips document text through an explicit web storage adapter', async () => {
		const storage = new MemoryWebStorage()
		const store = new WebFallbackDocumentStore(
			'rahrow.mobile.settings.json',
			storage,
		)

		await store.writeAtomic('{"engineId":"xray"}\n')

		const restarted = new WebFallbackDocumentStore(
			'rahrow.mobile.settings.json',
			storage,
		)

		await expect(restarted.read()).resolves.toBe('{"engineId":"xray"}\n')
	})
})

describe('createMobileDocumentStore', () => {
	it('uses Capacitor Preferences on native platforms', async () => {
		const preferences = new MemoryKeyValueStore()
		const store = createMobileDocumentStore('profiles.json', {
			native: true,
			preferences,
		})

		await store.write('{"version":1}\n')

		await expect(store.read()).resolves.toBe('{"version":1}\n')
		await expect(preferences.get('rahrow.profiles.json')).resolves.toBe(
			'{"version":1}\n',
		)
	})

	it('uses the explicit web fallback when native Capacitor is unavailable', async () => {
		const storage = new MemoryWebStorage()
		const store = createMobileDocumentStore('settings.json', {
			native: false,
			storage,
		})

		await store.write('{"engineId":"xray"}\n')

		await expect(store.read()).resolves.toBe('{"engineId":"xray"}\n')
		expect(storage.getItem('rahrow.mobile.settings.json')).toBe(
			'{"engineId":"xray"}\n',
		)
	})
})
