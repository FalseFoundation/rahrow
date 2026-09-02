import { Capacitor } from '@capacitor/core'
import type { StringDocumentStore } from '@rahrow/core/storage/json-store.ts'

export interface KeyValueStore {
	get(key: string): Promise<string | null>
	set(key: string, value: string): Promise<void>
}

export interface MobileDocumentStoreOptions {
	readonly native?: boolean
	readonly preferences?: KeyValueStore
	readonly storage?: Pick<Storage, 'getItem' | 'setItem'>
}

export class PreferencesDocumentStore implements StringDocumentStore {
	constructor(
		private readonly key: string,
		private readonly preferences: KeyValueStore,
	) {}

	async read(): Promise<string | null> {
		return this.preferences.get(this.key)
	}

	async write(value: string): Promise<void> {
		await this.preferences.set(this.key, value)
	}

	async writeAtomic(value: string): Promise<void> {
		await this.write(value)
	}
}

export class WebFallbackDocumentStore implements StringDocumentStore {
	constructor(
		private readonly key: string,
		private readonly storage: Pick<Storage, 'getItem' | 'setItem'>,
	) {}

	async read(): Promise<string | null> {
		return this.storage.getItem(this.key)
	}

	async write(value: string): Promise<void> {
		this.storage.setItem(this.key, value)
	}

	async writeAtomic(value: string): Promise<void> {
		await this.write(value)
	}
}

export function createMobileDocumentStore(
	fileName: string,
	options: MobileDocumentStoreOptions = {},
): StringDocumentStore {
	const native = options.native ?? Capacitor.isNativePlatform()

	if (native) {
		return new PreferencesDocumentStore(
			`rahrow.${fileName}`,
			options.preferences ?? createCapacitorPreferencesStore(),
		)
	}

	return new WebFallbackDocumentStore(
		`rahrow.mobile.${fileName}`,
		options.storage ?? defaultWebStorage(),
	)
}

function createCapacitorPreferencesStore(): KeyValueStore {
	const plugin = import('@capacitor/preferences')

	return {
		async get(key) {
			const { Preferences } = await plugin
			const result = await Preferences.get({ key })
			return result.value
		},
		async set(key, value) {
			const { Preferences } = await plugin
			await Preferences.set({ key, value })
		},
	}
}

function defaultWebStorage(): Pick<Storage, 'getItem' | 'setItem'> {
	if (typeof globalThis.localStorage === 'undefined') {
		throw new Error('WebFallbackDocumentStore requires localStorage in web/dev')
	}

	return globalThis.localStorage
}
