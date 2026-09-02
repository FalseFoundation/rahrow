import type { ConnectionMode } from '../connection/connection-mode.ts'
import { ProfileError } from '../errors.ts'
import type { ConnectionProfile } from '../profile/connection-profile.ts'
import {
	parseConnectionProfile,
	parseSettings,
} from '../profile/profile-schema.ts'
import type { EngineId, LatencyResult } from '../runtime/proxy-engine.ts'

export interface ProfileStore {
	list(): Promise<readonly ConnectionProfile[]>
	get(id: string): Promise<ConnectionProfile | null>
	save(profile: ConnectionProfile): Promise<void>
	remove(id: string): Promise<void>
	replaceAll?(profiles: readonly ConnectionProfile[]): Promise<void>
}

export interface Settings {
	readonly activeProfileId?: string
	readonly localPort?: number
	readonly engineId?: EngineId
	readonly connectionMode?: ConnectionMode
	readonly routingMode?: 'global' | 'rule' | 'direct'
	readonly language?: string
	readonly theme?: 'system' | 'light' | 'dark'
	readonly launchAtStartup?: boolean
	readonly connectionsView?: ConnectionsViewSettings
	readonly latencyResults?: Readonly<Record<string, LatencyResult>>
	readonly smartConnect?: SmartConnectScheduleState
}

export interface SmartConnectScheduleState {
	readonly enabled: boolean
	readonly lastRunAt?: string
	readonly nextRunAt?: string
	readonly lastDecision?: {
		readonly profileId: string
		readonly latencyMs: number
		readonly decidedAt: string
	}
}

export type ConnectionsSort =
	| 'default'
	| 'endpoint'
	| 'name'
	| 'protocol'
	| 'speed-test'

export interface ConnectionsViewSettings {
	readonly version: 1
	readonly groupOpen: Readonly<Record<string, boolean>>
	readonly query: string
	readonly sort: ConnectionsSort
	readonly scrollOffset?: number
	readonly loadedProfileCount?: number
	/** Present only when a malformed or obsolete persisted value was recovered. */
	readonly recoveredFromInvalid?: true
}

export interface SettingsStore {
	read(): Promise<Settings>
	write(settings: Settings): Promise<void>
}

export interface StringDocumentStore {
	read(): Promise<string | null>
	write(value: string): Promise<void>
	writeAtomic?(value: string): Promise<void>
}

export class JsonProfileStore implements ProfileStore {
	constructor(private readonly document: StringDocumentStore) {}

	async list(): Promise<readonly ConnectionProfile[]> {
		return readProfiles(this.document)
	}

	async get(id: string): Promise<ConnectionProfile | null> {
		const profiles = await this.list()

		return profiles.find((profile) => profile.id === id) ?? null
	}

	async save(profile: ConnectionProfile): Promise<void> {
		const parsed = parseConnectionProfile(profile)
		const profiles = await this.list()
		const next = [
			...profiles.filter((candidate) => candidate.id !== parsed.id),
			parsed,
		].sort(compareById)

		await writeDocument(this.document, formatJson({ version: 1, profiles: next }))
	}

	async remove(id: string): Promise<void> {
		const profiles = await this.list()
		const next = profiles.filter((profile) => profile.id !== id)

		await writeDocument(this.document, formatJson({ version: 1, profiles: next }))
	}

	async replaceAll(profiles: readonly ConnectionProfile[]): Promise<void> {
		const parsed = profiles.map(parseConnectionProfile).sort(compareById)
		const ids = new Set(parsed.map((profile) => profile.id))
		if (ids.size !== parsed.length) {
			throw new ProfileError(
				'invalid_profile',
				'Profile replacement contains duplicate ids',
			)
		}

		await writeDocument(
			this.document,
			formatJson({ version: 1, profiles: parsed }),
		)
	}
}

export class JsonSettingsStore implements SettingsStore {
	constructor(private readonly document: StringDocumentStore) {}

	async read(): Promise<Settings> {
		const raw = await this.document.read()

		if (!raw) {
			return parseSettings({})
		}

		const parsed = parseJsonObject(
			raw,
			'Settings store must contain a JSON object',
		)
		const settings = parseSettings(parsed.settings ?? parsed)

		return settings
	}

	async write(settings: Settings): Promise<void> {
		await writeDocument(
			this.document,
			formatJson({ version: 1, settings: parseSettings(settings) }),
		)
	}
}

export class MemoryDocumentStore implements StringDocumentStore {
	constructor(private value: string | null = null) {}

	async read(): Promise<string | null> {
		return this.value
	}

	async write(value: string): Promise<void> {
		this.value = value
	}
}

async function readProfiles(document: StringDocumentStore) {
	const raw = await document.read()

	if (!raw) {
		return []
	}

	const parsed = parseJsonObject(raw, 'Profile store must contain a JSON object')
	const profiles = Array.isArray(parsed.profiles) ? parsed.profiles : []
	const parsedProfiles = profiles.map((profile) =>
		parseConnectionProfile(profile),
	)
	const ids = new Set<string>()

	for (const profile of parsedProfiles) {
		if (ids.has(profile.id)) {
			throw new ProfileError(
				'invalid_profile',
				`Profile store contains duplicate profile id ${profile.id}`,
			)
		}

		ids.add(profile.id)
	}

	return parsedProfiles.sort(compareById)
}

function parseJsonObject(input: string, message: string) {
	try {
		const parsed = JSON.parse(input)

		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
			throw new Error(message)
		}

		return parsed as Record<string, unknown>
	} catch (error) {
		throw new ProfileError(
			'invalid_profile',
			error instanceof Error ? error.message : message,
			{ cause: error },
		)
	}
}

async function writeDocument(
	document: StringDocumentStore,
	value: string,
): Promise<void> {
	if (document.writeAtomic) {
		await document.writeAtomic(value)
		return
	}

	await document.write(value)
}

function compareById(left: ConnectionProfile, right: ConnectionProfile) {
	return left.id.localeCompare(right.id)
}

function formatJson(value: unknown) {
	return `${JSON.stringify(value, null, 2)}\n`
}
