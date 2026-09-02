import { ProfileError } from '@rahrow/core/errors.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import {
	JsonProfileStore,
	JsonSettingsStore,
} from '@rahrow/core/storage/json-store.ts'
import { describe, expect, it } from 'vitest'

import {
	BrowserFallbackDocumentStore,
	createDesktopDocumentStore,
	type DesktopFileSystem,
	TauriDocumentStore,
} from './tauri-document-store.ts'

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

class MemoryDesktopFileSystem implements DesktopFileSystem {
	readonly files = new Map<string, string>()
	readonly createdDirectories: string[] = []
	failNextRename = false

	async exists(relativePath: string): Promise<boolean> {
		return this.files.has(relativePath)
	}

	async readTextFile(relativePath: string): Promise<string> {
		const value = this.files.get(relativePath)

		if (value === undefined) {
			throw new Error(`Missing file: ${relativePath}`)
		}

		return value
	}

	async writeTextFile(relativePath: string, contents: string): Promise<void> {
		this.files.set(relativePath, contents)
	}

	async mkdir(relativePath: string): Promise<void> {
		this.createdDirectories.push(relativePath)
	}

	async rename(from: string, to: string): Promise<void> {
		if (this.failNextRename) {
			this.failNextRename = false
			throw new Error('rename failed')
		}

		const value = this.files.get(from)

		if (value === undefined) {
			throw new Error(`Missing file: ${from}`)
		}

		this.files.set(to, value)
		this.files.delete(from)
	}

	async remove(relativePath: string): Promise<void> {
		this.files.delete(relativePath)
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

describe('TauriDocumentStore', () => {
	it('returns null when the document file is missing', async () => {
		const store = new TauriDocumentStore(
			'profiles.json',
			new MemoryDesktopFileSystem(),
		)

		await expect(store.read()).resolves.toBeNull()
	})

	it('round-trips document text through write and read', async () => {
		const store = new TauriDocumentStore(
			'profiles.json',
			new MemoryDesktopFileSystem(),
		)

		await store.write('{"version":1}\n')

		await expect(store.read()).resolves.toBe('{"version":1}\n')
	})

	it('creates the app-data directory before the first atomic write', async () => {
		const fileSystem = new MemoryDesktopFileSystem()
		const store = new TauriDocumentStore('profiles.json', fileSystem)

		await store.writeAtomic('{"profiles":[]}\n')

		expect(fileSystem.createdDirectories).toContain('.')
		expect(fileSystem.files.has('profiles.json')).toBe(true)
	})

	it('preserves document text after writeAtomic across a new store instance', async () => {
		const fileSystem = new MemoryDesktopFileSystem()
		const store = new TauriDocumentStore('settings.json', fileSystem)

		await store.writeAtomic('{"theme":"dark"}\n')

		const restarted = new TauriDocumentStore('settings.json', fileSystem)

		await expect(restarted.read()).resolves.toBe('{"theme":"dark"}\n')
		expect(fileSystem.files.has('settings.json.tmp')).toBe(false)
	})

	it('keeps the previous document when writeAtomic rename fails', async () => {
		const fileSystem = new MemoryDesktopFileSystem()
		const store = new TauriDocumentStore('settings.json', fileSystem)

		await store.writeAtomic('{"theme":"light"}\n')
		fileSystem.failNextRename = true

		await expect(store.writeAtomic('{"theme":"dark"}\n')).rejects.toThrow(
			'rename failed',
		)
		await expect(store.read()).resolves.toBe('{"theme":"light"}\n')
		expect(fileSystem.files.has('settings.json.tmp')).toBe(false)
	})

	it('rejects document paths that escape the app data directory', () => {
		expect(
			() =>
				new TauriDocumentStore('../secrets.json', new MemoryDesktopFileSystem()),
		).toThrow('Unsafe document path')
	})

	it('lets JsonProfileStore persist profiles across a new store instance', async () => {
		const fileSystem = new MemoryDesktopFileSystem()
		const store = new JsonProfileStore(
			new TauriDocumentStore('profiles.json', fileSystem),
		)

		await store.save(profile)

		const restarted = new JsonProfileStore(
			new TauriDocumentStore('profiles.json', fileSystem),
		)

		await expect(restarted.list()).resolves.toEqual([profile])
	})

	it('fails closed when JsonProfileStore reads corrupt JSON', async () => {
		const fileSystem = new MemoryDesktopFileSystem()
		await fileSystem.writeTextFile('profiles.json', '{')

		const store = new JsonProfileStore(
			new TauriDocumentStore('profiles.json', fileSystem),
		)

		await expect(store.list()).rejects.toThrow(ProfileError)
	})

	it('fails closed when JsonProfileStore reads an invalid profile', async () => {
		const fileSystem = new MemoryDesktopFileSystem()
		await fileSystem.writeTextFile(
			'profiles.json',
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
			new TauriDocumentStore('profiles.json', fileSystem),
		)

		await expect(store.list()).rejects.toThrow(ProfileError)
	})

	it('lets JsonSettingsStore persist settings across a new store instance', async () => {
		const fileSystem = new MemoryDesktopFileSystem()
		const store = new JsonSettingsStore(
			new TauriDocumentStore('settings.json', fileSystem),
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
			new TauriDocumentStore('settings.json', fileSystem),
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

describe('BrowserFallbackDocumentStore', () => {
	it('round-trips document text through an explicit web storage adapter', async () => {
		const storage = new MemoryWebStorage()
		const store = new BrowserFallbackDocumentStore(
			'rahrow.desktop.settings.json',
			storage,
		)

		await store.writeAtomic('{"engineId":"xray"}\n')

		const restarted = new BrowserFallbackDocumentStore(
			'rahrow.desktop.settings.json',
			storage,
		)

		await expect(restarted.read()).resolves.toBe('{"engineId":"xray"}\n')
	})
})

describe('createDesktopDocumentStore', () => {
	it('uses the explicit browser fallback when Tauri is unavailable', async () => {
		const storage = new MemoryWebStorage()
		const store = createDesktopDocumentStore('settings.json', {
			tauri: false,
			storage,
		})

		await store.write('{"engineId":"xray"}\n')

		await expect(store.read()).resolves.toBe('{"engineId":"xray"}\n')
		expect(storage.getItem('rahrow.desktop.settings.json')).toBe(
			'{"engineId":"xray"}\n',
		)
	})
})
