import {
	parseSubscriptionMetadataValue,
	type Subscription,
	type SubscriptionStore,
} from '../subscription/subscription-import.ts'
import type { StringDocumentStore } from './json-store.ts'

export class JsonSubscriptionStore implements SubscriptionStore {
	constructor(private readonly document: StringDocumentStore) {}

	async list(): Promise<readonly Subscription[]> {
		let raw: string | null

		try {
			raw = await this.document.read()
		} catch {
			throw new SubscriptionStorageError(
				'read_failed',
				'Could not read saved subscriptions',
			)
		}

		if (!raw) {
			return []
		}

		let parsed: unknown

		try {
			parsed = JSON.parse(raw)
		} catch {
			throw invalidSubscriptionDocument()
		}

		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw invalidSubscriptionDocument()
		}

		const subscriptions = (parsed as { subscriptions?: unknown }).subscriptions

		if (!Array.isArray(subscriptions)) {
			throw invalidSubscriptionDocument()
		}

		try {
			return subscriptions.map(parseSubscription).sort(compareById)
		} catch {
			throw invalidSubscriptionDocument()
		}
	}

	async save(subscription: Subscription): Promise<void> {
		const parsed = parseSubscription(subscription)
		const subscriptions = [
			...(await this.list()).filter((candidate) => candidate.id !== parsed.id),
			parsed,
		].sort(compareById)

		await this.write(subscriptions)
	}

	async remove(id: string): Promise<void> {
		const subscriptions = (await this.list()).filter(
			(subscription) => subscription.id !== id,
		)

		await this.write(subscriptions)
	}

	async replaceAll(subscriptions: readonly Subscription[]): Promise<void> {
		await this.write(subscriptions.map(parseSubscription).sort(compareById))
	}

	private async write(subscriptions: readonly Subscription[]): Promise<void> {
		const value = `${JSON.stringify({ version: 1, subscriptions }, null, 2)}\n`

		if (this.document.writeAtomic) {
			await this.document.writeAtomic(value)
			return
		}

		await this.document.write(value)
	}
}

export class SubscriptionStorageError extends Error {
	constructor(
		readonly code: 'invalid_document' | 'read_failed',
		message: string,
	) {
		super(message)
		this.name = 'SubscriptionStorageError'
	}
}

function invalidSubscriptionDocument() {
	return new SubscriptionStorageError(
		'invalid_document',
		'Saved subscriptions are invalid and were not changed',
	)
}

function parseSubscription(input: unknown): Subscription {
	if (!input || typeof input !== 'object' || Array.isArray(input)) {
		throw new Error('invalid subscription')
	}

	const candidate = input as Record<string, unknown>

	if (typeof candidate.id !== 'string' || typeof candidate.url !== 'string') {
		throw new Error('invalid subscription')
	}
	const metadata = parseSubscriptionMetadataValue(candidate.metadata)

	return {
		id: candidate.id,
		url: candidate.url,
		...(typeof candidate.name === 'string' ? { name: candidate.name } : {}),
		...(typeof candidate.locked === 'boolean'
			? { locked: candidate.locked }
			: {}),
		...(typeof candidate.updatedAt === 'string'
			? { updatedAt: candidate.updatedAt }
			: {}),
		...(typeof candidate.credentialId === 'string'
			? { credentialId: candidate.credentialId }
			: {}),
		...(metadata ? { metadata } : {}),
	}
}

function compareById(left: Subscription, right: Subscription) {
	return left.id.localeCompare(right.id)
}
