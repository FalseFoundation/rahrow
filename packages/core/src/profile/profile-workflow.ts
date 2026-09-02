import type { ProtocolRegistry } from '../protocol/connection-protocol.ts'
import type { ProfileStore } from '../storage/json-store.ts'
import type { ImportSource } from '../subscription/subscription-import.ts'
import {
	type ImportIssue,
	parseImportedProfilesWithReport,
} from '../subscription/subscription-import.ts'
import type { ConnectionProfile } from './connection-profile.ts'
import { parseConnectionProfile } from './profile-schema.ts'

export interface ProfileImportResult {
	readonly profiles: readonly ConnectionProfile[]
	readonly issues: readonly ImportIssue[]
}

export interface ProfileSubscriptionDraft {
	readonly id: string
	readonly url: string
	readonly content: string
}

export interface ProfileCollectionScheduler {
	process<TItem, TResult>(
		items: readonly TItem[],
		transform: (batch: readonly TItem[]) => readonly TResult[],
	): Promise<readonly TResult[]>
}

async function processProfileCollection<TItem, TResult>(
	items: readonly TItem[],
	transform: (batch: readonly TItem[]) => readonly TResult[],
	scheduler?: ProfileCollectionScheduler,
): Promise<readonly TResult[]> {
	return scheduler ? scheduler.process(items, transform) : transform(items)
}

export async function importProfilesToStore(
	input: {
		readonly value: string
		readonly source: ImportSource
	},
	store: ProfileStore,
	registry: ProtocolRegistry,
): Promise<ProfileImportResult> {
	const result = parseImportedProfilesWithReport(input, registry)

	for (const profile of result.profiles) {
		await store.save(profile)
	}

	return result
}

export async function replaceSubscriptionProfiles(
	store: ProfileStore,
	subscriptionId: string,
	profiles: readonly ConnectionProfile[],
	scheduler?: ProfileCollectionScheduler,
): Promise<void> {
	if (!store.replaceAll) {
		throw new Error('Profile store does not support atomic replacement')
	}

	const current = await store.list()
	const replacement = await processProfileCollection(
		profiles,
		(batch) =>
			batch.map((profile) =>
				parseConnectionProfile({
					...profile,
					metadata: {
						...profile.metadata,
						source: 'subscription',
						subscriptionId,
					},
				}),
			),
		scheduler,
	)
	const retained = await processProfileCollection(
		current,
		(batch) =>
			batch.filter(
				(profile) => profile.metadata?.subscriptionId !== subscriptionId,
			),
		scheduler,
	)
	const next = [...retained, ...replacement]

	await store.replaceAll(next)
}

export async function removeSubscriptionProfiles(
	store: ProfileStore,
	subscriptionId: string,
	scheduler?: ProfileCollectionScheduler,
): Promise<void> {
	if (!store.replaceAll) {
		throw new Error('Profile store does not support atomic replacement')
	}

	const current = await store.list()
	const retained = await processProfileCollection(
		current,
		(batch) =>
			batch.filter(
				(profile) => profile.metadata?.subscriptionId !== subscriptionId,
			),
		scheduler,
	)
	await store.replaceAll(retained)
}

export function renameProfile(
	profile: ConnectionProfile,
	name: string,
): ConnectionProfile {
	const trimmedName = name.trim()

	return parseConnectionProfile({
		...profile,
		metadata: {
			...profile.metadata,
			...(trimmedName ? { name: trimmedName } : {}),
		},
	})
}

export function duplicateProfile(
	profile: ConnectionProfile,
	input: {
		readonly suffix: string | number
	},
): ConnectionProfile {
	return parseConnectionProfile({
		...profile,
		id: `${profile.id}:copy-${input.suffix}`,
		metadata: {
			...profile.metadata,
			name: `${profile.metadata?.name ?? profile.id} copy`,
		},
	})
}

export function upsertProfileSubscriptionDraft(
	subscriptions: readonly ProfileSubscriptionDraft[],
	draft: ProfileSubscriptionDraft,
): readonly ProfileSubscriptionDraft[] {
	const id = draft.id.trim()
	const url = draft.url.trim()

	if (!id || !url) {
		return subscriptions
	}

	return [
		...subscriptions.filter((subscription) => subscription.id !== id),
		{
			id,
			url,
			content: draft.content,
		},
	].sort((left, right) => left.id.localeCompare(right.id))
}
