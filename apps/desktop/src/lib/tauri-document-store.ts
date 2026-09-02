import { asError } from '@rahrow/core/errors.ts'
import type { StringDocumentStore } from '@rahrow/core/storage/json-store.ts'

export interface DesktopFileSystem {
	exists(relativePath: string): Promise<boolean>
	readTextFile(relativePath: string): Promise<string>
	writeTextFile(relativePath: string, contents: string): Promise<void>
	mkdir(relativePath: string): Promise<void>
	rename(from: string, to: string): Promise<void>
	remove(relativePath: string): Promise<void>
}

export interface DesktopDocumentStoreOptions {
	readonly tauri?: boolean
	readonly fileSystem?: DesktopFileSystem
	readonly storage?: Pick<Storage, 'getItem' | 'setItem'>
}

export class TauriDocumentStore implements StringDocumentStore {
	constructor(
		private readonly relativePath: string,
		private readonly fileSystem: DesktopFileSystem,
	) {
		assertSafeRelativePath(relativePath)
	}

	async read(): Promise<string | null> {
		if (!(await this.fileSystem.exists(this.relativePath))) {
			return null
		}

		return this.fileSystem.readTextFile(this.relativePath)
	}

	async write(value: string): Promise<void> {
		await this.ensureDirectory()
		await this.fileSystem.writeTextFile(this.relativePath, value)
	}

	async writeAtomic(value: string): Promise<void> {
		await this.ensureDirectory()
		const temporaryPath = `${this.relativePath}.tmp`

		await this.fileSystem.writeTextFile(temporaryPath, value)

		try {
			await this.fileSystem.rename(temporaryPath, this.relativePath)
		} catch (error) {
			await this.fileSystem.remove(temporaryPath).catch(() => undefined)
			throw error
		}
	}

	private async ensureDirectory(): Promise<void> {
		await this.fileSystem.mkdir(parentDirectory(this.relativePath) ?? '.')
	}
}

export class BrowserFallbackDocumentStore implements StringDocumentStore {
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

export function createDesktopDocumentStore(
	fileName: string,
	options: DesktopDocumentStoreOptions = {},
): StringDocumentStore {
	const tauri = options.tauri ?? isTauriRuntime()

	if (tauri) {
		return new TauriDocumentStore(
			fileName,
			options.fileSystem ?? createTauriAppDataFileSystem(),
		)
	}

	return new BrowserFallbackDocumentStore(
		`rahrow.desktop.${fileName}`,
		options.storage ?? defaultWebStorage(),
	)
}

export function createTauriAppDataFileSystem(): DesktopFileSystem {
	const plugin = import('@tauri-apps/plugin-fs')

	return {
		async exists(relativePath) {
			try {
				const { exists, BaseDirectory } = await plugin
				return exists(relativePath, { baseDir: BaseDirectory.AppData })
			} catch (error) {
				throw asError(error, `Failed to check ${relativePath}`)
			}
		},
		async readTextFile(relativePath) {
			try {
				const { readTextFile, BaseDirectory } = await plugin
				return readTextFile(relativePath, { baseDir: BaseDirectory.AppData })
			} catch (error) {
				throw asError(error, `Failed to read ${relativePath}`)
			}
		},
		async writeTextFile(relativePath, contents) {
			try {
				const { writeTextFile, BaseDirectory } = await plugin
				await writeTextFile(relativePath, contents, {
					baseDir: BaseDirectory.AppData,
					create: true,
				})
			} catch (error) {
				throw asError(error, `Failed to write ${relativePath}`)
			}
		},
		async mkdir(relativePath) {
			try {
				const { mkdir, BaseDirectory } = await plugin
				if (relativePath === '.' || relativePath === '') {
					try {
						await mkdir('.', {
							baseDir: BaseDirectory.AppData,
							recursive: true,
						})
						return
					} catch {
						const { appDataDir } = await import('@tauri-apps/api/path')
						await mkdir(await appDataDir(), { recursive: true })
						return
					}
				}

				await mkdir(relativePath, {
					baseDir: BaseDirectory.AppData,
					recursive: true,
				})
			} catch (error) {
				throw asError(error, `Failed to create ${relativePath}`)
			}
		},
		async rename(from, to) {
			try {
				const { rename, BaseDirectory } = await plugin
				await rename(from, to, {
					oldPathBaseDir: BaseDirectory.AppData,
					newPathBaseDir: BaseDirectory.AppData,
				})
			} catch (error) {
				throw asError(error, `Failed to rename ${from}`)
			}
		},
		async remove(relativePath) {
			try {
				const { remove, BaseDirectory } = await plugin
				await remove(relativePath, { baseDir: BaseDirectory.AppData })
			} catch (error) {
				throw asError(error, `Failed to remove ${relativePath}`)
			}
		},
	}
}

function assertSafeRelativePath(relativePath: string): void {
	if (
		relativePath.length === 0 ||
		relativePath.startsWith('/') ||
		relativePath.includes('..') ||
		relativePath.includes('\\')
	) {
		throw new Error(`Unsafe document path: ${relativePath}`)
	}
}

function parentDirectory(relativePath: string): string | undefined {
	const index = relativePath.lastIndexOf('/')

	if (index <= 0) {
		return undefined
	}

	return relativePath.slice(0, index)
}

function isTauriRuntime(): boolean {
	return typeof globalThis !== 'undefined' && '__TAURI_INTERNALS__' in globalThis
}

function defaultWebStorage(): Pick<Storage, 'getItem' | 'setItem'> {
	if (typeof globalThis.localStorage === 'undefined') {
		throw new Error(
			'BrowserFallbackDocumentStore requires localStorage in web/dev',
		)
	}

	return globalThis.localStorage
}
