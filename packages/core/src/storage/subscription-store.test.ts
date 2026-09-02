import { describe, expect, it } from 'vitest'

import { MemoryDocumentStore } from './json-store.ts'
import {
	JsonSubscriptionStore,
	type SubscriptionStorageError,
} from './subscription-store.ts'

describe('JsonSubscriptionStore', () => {
	it('persists subscriptions across store instances', async () => {
		const document = new MemoryDocumentStore()
		const store = new JsonSubscriptionStore(document)

		await store.save({
			id: 'main',
			url: 'https://example.com/sub.txt',
			name: 'Main',
		})

		const restarted = new JsonSubscriptionStore(document)

		await expect(restarted.list()).resolves.toEqual([
			{
				id: 'main',
				url: 'https://example.com/sub.txt',
				name: 'Main',
			},
		])
	})

	it('fails closed on corrupt JSON', async () => {
		const original = '{'
		const document = new MemoryDocumentStore(original)
		const store = new JsonSubscriptionStore(document)

		await expect(
			store.save({
				id: 'replacement',
				url: 'https://user:secret@example.com/sub.txt',
			}),
		).rejects.toMatchObject<Partial<SubscriptionStorageError>>({
			code: 'invalid_document',
			message: 'Saved subscriptions are invalid and were not changed',
		})
		await expect(document.read()).resolves.toBe(original)
	})

	it('preserves an invalid document shape when save is attempted', async () => {
		const original = JSON.stringify({ version: 1, subscriptions: {} })
		const document = new MemoryDocumentStore(original)
		const store = new JsonSubscriptionStore(document)

		await expect(
			store.save({ id: 'replacement', url: 'https://example.com/sub.txt' }),
		).rejects.toMatchObject({ code: 'invalid_document' })
		await expect(document.read()).resolves.toBe(original)
	})

	it('does not write when the existing document cannot be read', async () => {
		let writes = 0
		const document = {
			read: async () => {
				throw new Error('failed for https://user:secret@example.com/sub.txt')
			},
			write: async () => {
				writes += 1
			},
		}
		const store = new JsonSubscriptionStore(document)

		const result = store.save({
			id: 'replacement',
			url: 'https://example.com/sub.txt',
		})
		await expect(result).rejects.toMatchObject({
			code: 'read_failed',
			message: 'Could not read saved subscriptions',
		})
		await expect(result).rejects.not.toThrow('secret')
		expect(writes).toBe(0)
	})

	it('uses the atomic writer without touching the non-atomic path', async () => {
		let stored: string | null = null
		let ordinaryWrites = 0
		let atomicWrites = 0
		const document = {
			read: async () => stored,
			write: async () => {
				ordinaryWrites += 1
			},
			writeAtomic: async (value: string) => {
				atomicWrites += 1
				stored = value
			},
		}
		const store = new JsonSubscriptionStore(document)

		await store.save({ id: 'main', url: 'https://example.com/sub.txt' })

		expect(atomicWrites).toBe(1)
		expect(ordinaryWrites).toBe(0)
		await expect(store.list()).resolves.toHaveLength(1)
	})

	it('leaves the original bytes intact when an atomic write fails', async () => {
		const original = `${JSON.stringify({
			version: 1,
			subscriptions: [{ id: 'existing', url: 'https://example.com/existing.txt' }],
		})}\n`
		let stored = original
		const document = {
			read: async () => stored,
			write: async (value: string) => {
				stored = value
			},
			writeAtomic: async () => {
				throw new Error('atomic write failed')
			},
		}
		const store = new JsonSubscriptionStore(document)

		await expect(
			store.save({ id: 'new', url: 'https://example.com/new.txt' }),
		).rejects.toThrow('atomic write failed')
		expect(stored).toBe(original)
	})

	it('lists deterministically and removes only the requested subscription', async () => {
		const store = new JsonSubscriptionStore(new MemoryDocumentStore())
		await store.save({ id: 'z-last', url: 'https://example.com/z.txt' })
		await store.save({ id: 'a-first', url: 'https://example.com/a.txt' })

		await expect(store.list()).resolves.toEqual([
			expect.objectContaining({ id: 'a-first' }),
			expect.objectContaining({ id: 'z-last' }),
		])

		await store.remove('a-first')
		await expect(store.list()).resolves.toEqual([
			expect.objectContaining({ id: 'z-last' }),
		])
	})

	it('atomically replaces the complete subscription collection', async () => {
		const store = new JsonSubscriptionStore(new MemoryDocumentStore())
		await store.save({ id: 'remove', url: 'https://example.com/remove.txt' })

		await store.replaceAll([{ id: 'keep', url: 'https://example.com/keep.txt' }])

		await expect(store.list()).resolves.toEqual([
			expect.objectContaining({ id: 'keep' }),
		])
	})

	it('round-trips validated usage and expiry metadata', async () => {
		const store = new JsonSubscriptionStore(new MemoryDocumentStore())
		await store.save({
			id: 'metered',
			url: 'https://example.com/sub.txt',
			metadata: {
				usage: {
					downloadBytes: 2_048,
					totalBytes: 8_192,
					expiresAt: '2026-09-13T19:26:51.000Z',
				},
			},
		})

		await expect(store.list()).resolves.toEqual([
			expect.objectContaining({
				metadata: {
					usage: {
						downloadBytes: 2_048,
						totalBytes: 8_192,
						expiresAt: '2026-09-13T19:26:51.000Z',
					},
				},
			}),
		])
	})

	it('migrates older records while omitting malformed and unknown metadata', async () => {
		const document = new MemoryDocumentStore(
			JSON.stringify({
				version: 1,
				subscriptions: [
					{
						id: 'legacy',
						url: 'https://example.com/sub.txt',
						metadata: {
							usage: { downloadBytes: -1, totalBytes: 4096 },
							supportUrl: 'https://user:secret@example.com/help',
							credential: 'Bearer secret',
						},
					},
				],
			}),
		)

		await expect(new JsonSubscriptionStore(document).list()).resolves.toEqual([
			{
				id: 'legacy',
				url: 'https://example.com/sub.txt',
				metadata: { usage: { totalBytes: 4096 } },
			},
		])
		expect(
			JSON.stringify(await new JsonSubscriptionStore(document).list()),
		).not.toContain('secret')
	})

	it('round-trips the subscription lock without inventing it for old data', async () => {
		const store = new JsonSubscriptionStore(new MemoryDocumentStore())
		await store.save({
			id: 'locked',
			url: 'https://example.com/locked.txt',
			locked: true,
		})

		await expect(store.list()).resolves.toEqual([
			{
				id: 'locked',
				url: 'https://example.com/locked.txt',
				locked: true,
			},
		])
	})
})
