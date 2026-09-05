import { describe, expect, it } from 'vitest'

import { MemoryDocumentStore } from '../storage/json-store.ts'
import {
	commitRawEngineDocument,
	type RawEngineDocumentAdapter,
	stageRawEngineDocument,
} from './raw-engine-document.ts'

const adapter: RawEngineDocumentAdapter = {
	engineId: 'xray',
	engineVersion: '26.7.28',
	validate(rawDocument) {
		return JSON.parse(rawDocument) as unknown
	},
	listExtractableOutbounds() {
		return []
	},
	extractOutbound() {
		throw new Error('not used')
	},
}

describe('raw engine document persistence', () => {
	it('preserves the original validated document and commits it atomically', async () => {
		const original = '{\n  "outbounds": []\n}\n'
		const store = new AtomicDocumentStore()
		const staged = await stageRawEngineDocument(original, adapter)

		expect(staged.original).toBe(original)
		expect(staged.engineId).toBe('xray')
		expect(staged.engineVersion).toBe('26.7.28')

		await commitRawEngineDocument(staged, store, true)

		expect(store.atomicWrites).toEqual([original])
		expect(await store.read()).toBe(original)
	})

	it('does not mutate persistence when validation fails', async () => {
		const store = new AtomicDocumentStore('{"existing":true}')
		const rejectingAdapter: RawEngineDocumentAdapter = {
			...adapter,
			validate() {
				throw new Error('invalid engine document')
			},
		}

		await expect(
			stageRawEngineDocument('{"password":"secret-value"}', rejectingAdapter),
		).rejects.toThrow('invalid engine document')
		expect(await store.read()).toBe('{"existing":true}')
		expect(store.atomicWrites).toEqual([])
	})

	it('rejects stores that cannot guarantee atomic replacement', async () => {
		const staged = await stageRawEngineDocument('{"outbounds":[]}', adapter)

		await expect(
			commitRawEngineDocument(staged, new MemoryDocumentStore(), true),
		).rejects.toThrow('atomic replacement')
	})

	it('requires explicit confirmation before replacement', async () => {
		const store = new AtomicDocumentStore('{"existing":true}')
		const staged = await stageRawEngineDocument('{"outbounds":[]}', adapter)

		await expect(commitRawEngineDocument(staged, store, false)).rejects.toThrow(
			'confirmation',
		)
		expect(await store.read()).toBe('{"existing":true}')
	})
})

class AtomicDocumentStore extends MemoryDocumentStore {
	readonly atomicWrites: string[] = []

	async writeAtomic(value: string) {
		this.atomicWrites.push(value)
		await this.write(value)
	}
}
