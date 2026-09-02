import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

import type { StringDocumentStore } from '@rahrow/core/storage/json-store.ts'

export class FileDocumentStore implements StringDocumentStore {
	constructor(private readonly filePath: string) {}

	async read(): Promise<string | null> {
		try {
			return await readFile(this.filePath, 'utf8')
		} catch (error) {
			if (isNodeError(error) && error.code === 'ENOENT') {
				return null
			}

			throw error
		}
	}

	async write(value: string): Promise<void> {
		await mkdir(dirname(this.filePath), { recursive: true })
		await writeFile(this.filePath, value, 'utf8')
	}

	async writeAtomic(value: string): Promise<void> {
		const directory = dirname(this.filePath)
		const temporaryPath = `${this.filePath}.tmp-${process.pid}-${Date.now()}`

		await mkdir(directory, { recursive: true })
		await writeFile(temporaryPath, value, 'utf8')

		try {
			await rename(temporaryPath, this.filePath)
		} catch (error) {
			await unlink(temporaryPath).catch(() => undefined)
			throw error
		}
	}
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && 'code' in error
}
