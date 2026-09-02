import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import type { ProfileCollectionScheduler } from '@rahrow/core/profile/profile-workflow.ts'
import type { ProtocolRegistry } from '@rahrow/core/protocol/connection-protocol.ts'
import type { ProfileStore } from '@rahrow/core/storage/json-store.ts'
import { runInPacedBatches } from './paced-profile-work.ts'

export const CONNECTION_SORT_DEBOUNCE_MS = 32

const collectionBatchSize = 128
const persistenceBatchSize = 32

export function createPacedProfileCollectionScheduler(
	signal?: AbortSignal,
): ProfileCollectionScheduler {
	return {
		async process(items, transform) {
			const results = await runInPacedBatches(items, transform, {
				batchSize: collectionBatchSize,
				wait: 1,
				signal,
			})
			return results.flat()
		},
	}
}

export async function serializeProfilesPaced(
	profiles: readonly ConnectionProfile[],
	registry: Pick<ProtocolRegistry, 'serialize'>,
): Promise<string> {
	const serializedBatches = await runInPacedBatches(
		profiles,
		(batch) => batch.map((profile) => registry.serialize(profile)).join('\n'),
		{ batchSize: collectionBatchSize, wait: 1 },
	)
	return serializedBatches.filter(Boolean).join('\n')
}

export async function removeProfilesPaced(
	store: ProfileStore,
	targets: readonly ConnectionProfile[],
): Promise<void> {
	if (targets.length === 0) return
	const targetIds = new Set(targets.map(({ id }) => id))

	if (store.replaceAll) {
		const current = await store.list()
		const retainedBatches = await runInPacedBatches(
			current,
			(batch) => batch.filter(({ id }) => !targetIds.has(id)),
			{ batchSize: collectionBatchSize, wait: 1 },
		)
		await store.replaceAll(retainedBatches.flat())
		return
	}

	await runInPacedBatches(
		targets,
		async (batch) => {
			for (const profile of batch) await store.remove(profile.id)
		},
		{ batchSize: persistenceBatchSize, wait: 4 },
	)
}

export async function countSubscriptionProfilesPaced(
	profiles: readonly ConnectionProfile[],
	subscriptionId: string,
): Promise<number> {
	const counts = await runInPacedBatches(
		profiles,
		(batch) =>
			batch.reduce(
				(count, profile) =>
					count + (profile.metadata?.subscriptionId === subscriptionId ? 1 : 0),
				0,
			),
		{ batchSize: collectionBatchSize, wait: 1 },
	)
	return counts.reduce((total, count) => total + count, 0)
}

export async function haveSameRecordsPaced<
	TRecord extends { readonly id: string },
>(left: readonly TRecord[], right: readonly TRecord[]): Promise<boolean> {
	if (left.length !== right.length) return false
	const leftRecordBatches = await runInPacedBatches(
		left,
		(batch) =>
			batch.map((record) => [record.id, JSON.stringify(record)] as const),
		{ batchSize: collectionBatchSize, wait: 1 },
	)
	const leftRecords = new Map(leftRecordBatches.flat())
	const matches = await runInPacedBatches(
		right,
		(batch) =>
			batch.every(
				(record) => leftRecords.get(record.id) === JSON.stringify(record),
			),
		{ batchSize: collectionBatchSize, wait: 1 },
	)
	return matches.every(Boolean)
}
