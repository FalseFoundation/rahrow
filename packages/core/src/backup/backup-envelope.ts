import { z } from 'zod'
import {
	isProfileProtectedByLock,
	protectedSubscriptionIds,
} from '../profile/connection-lock-policy.ts'
import type { ConnectionProfile } from '../profile/connection-profile.ts'
import {
	connectionProfileSchema,
	parseConnectionProfile,
	parseSettings,
	settingsSchema,
} from '../profile/profile-schema.ts'
import type {
	ProfileStore,
	Settings,
	SettingsStore,
} from '../storage/json-store.ts'
import type { SubscriptionStore } from '../subscription/subscription-import.ts'

export const BACKUP_FILE_NAME = 'rahrow-backup.json'
export const PLAINTEXT_BACKUP_WARNING =
	'This plaintext backup contains sensitive connection secrets and settings. Store it securely.'

const FORMAT = 'rahrow-backup' as const
const VERSION = 1 as const
const PAYLOAD_VERSION = 1 as const
const PBKDF2_ITERATIONS = 600_000 as const
const MAX_DOCUMENT_LENGTH = 32 * 1024 * 1024
export const BACKUP_SETTING_KEYS = [
	'activeProfileId',
	'localPort',
	'engineId',
	'connectionMode',
	'routingMode',
	'language',
	'theme',
	'launchAtStartup',
	'connectionsView',
	'latencyResults',
] as const satisfies readonly (keyof Settings)[]

export type BackupSettingKey = (typeof BACKUP_SETTING_KEYS)[number]

const backupPayloadSchema = z
	.strictObject({
		version: z.literal(PAYLOAD_VERSION),
		createdAt: z.iso.datetime(),
		connections: z
			.array(connectionProfileSchema)
			.max(10_000)
			.readonly()
			.optional(),
		settings: settingsSchema.partial().optional(),
	})
	.superRefine((payload, context) => {
		if (!payload.connections && !payload.settings) {
			context.addIssue({
				code: 'custom',
				message: 'Backup payload must contain connections or settings',
			})
		}

		const ids = payload.connections?.map(({ id }) => id) ?? []
		if (new Set(ids).size !== ids.length) {
			context.addIssue({
				code: 'custom',
				path: ['connections'],
				message: 'Backup payload contains duplicate connection ids',
			})
		}
	})

const passwordProtectionSchema = z.strictObject({
	mode: z.literal('password'),
	kdf: z.strictObject({
		name: z.literal('PBKDF2'),
		hash: z.literal('SHA-256'),
		iterations: z.literal(PBKDF2_ITERATIONS),
		salt: z.string().regex(/^[A-Za-z0-9_-]{22}$/u),
	}),
	cipher: z.strictObject({
		name: z.literal('AES-GCM'),
		keyLength: z.literal(256),
		iv: z.string().regex(/^[A-Za-z0-9_-]{16}$/u),
		tagLength: z.literal(128),
	}),
})

const plaintextBackupSchema = z.strictObject({
	format: z.literal(FORMAT),
	version: z.literal(VERSION),
	protection: z.strictObject({ mode: z.literal('none') }),
	warning: z.literal(PLAINTEXT_BACKUP_WARNING),
	payload: backupPayloadSchema,
})

const protectedBackupSchema = z.strictObject({
	format: z.literal(FORMAT),
	version: z.literal(VERSION),
	protection: passwordProtectionSchema,
	ciphertext: z.string().min(22).max(MAX_DOCUMENT_LENGTH),
})

export const rahrowBackupEnvelopeSchema = z.union([
	plaintextBackupSchema,
	protectedBackupSchema,
])

export type RahrowBackupPayload = z.infer<typeof backupPayloadSchema>
export type PlaintextRahrowBackup = z.infer<typeof plaintextBackupSchema>
export type ProtectedRahrowBackup = z.infer<typeof protectedBackupSchema>
export type RahrowBackupDocument = PlaintextRahrowBackup | ProtectedRahrowBackup

export type BackupErrorCode =
	| 'invalid_backup'
	| 'unsupported_version'
	| 'password_required'
	| 'authentication_failed'
	| 'unresolved_conflicts'
	| 'atomic_import_unsupported'
	| 'atomic_import_failed'
	| 'invalid_selection'

export class BackupError extends Error {
	constructor(
		readonly code: BackupErrorCode,
		message: string,
		options?: ErrorOptions,
	) {
		super(message, options)
		this.name = 'BackupError'
	}
}

export type BackupSelection =
	| 'all'
	| {
			readonly connectionIds?: readonly string[]
			readonly settingKeys?: readonly BackupSettingKey[]
	  }

export interface CreateRahrowBackupInput {
	readonly connections: readonly ConnectionProfile[]
	readonly settings: Settings
	readonly selection: BackupSelection
	readonly password?: string
	readonly createdAt?: string
}

export interface CreatedRahrowBackup {
	readonly fileName: typeof BACKUP_FILE_NAME
	readonly warning?: typeof PLAINTEXT_BACKUP_WARNING
	readonly document: RahrowBackupDocument
}

export async function createRahrowBackup(
	input: CreateRahrowBackupInput,
): Promise<CreatedRahrowBackup> {
	const payload = selectPayload(input)

	if (input.password === undefined) {
		const document = plaintextBackupSchema.parse({
			format: FORMAT,
			version: VERSION,
			protection: { mode: 'none' },
			warning: PLAINTEXT_BACKUP_WARNING,
			payload,
		})

		return {
			fileName: BACKUP_FILE_NAME,
			warning: PLAINTEXT_BACKUP_WARNING,
			document,
		}
	}

	assertPassword(input.password)
	const crypto = cryptoApi()
	const salt = crypto.getRandomValues(new Uint8Array(16))
	const iv = crypto.getRandomValues(new Uint8Array(12))
	const protection = passwordProtectionSchema.parse({
		mode: 'password',
		kdf: {
			name: 'PBKDF2',
			hash: 'SHA-256',
			iterations: PBKDF2_ITERATIONS,
			salt: encodeBase64Url(salt),
		},
		cipher: {
			name: 'AES-GCM',
			keyLength: 256,
			iv: encodeBase64Url(iv),
			tagLength: 128,
		},
	})
	const key = await derivePasswordKey(input.password, protection)
	const ciphertext = await crypto.subtle.encrypt(
		{
			name: 'AES-GCM',
			iv: asArrayBuffer(iv),
			tagLength: protection.cipher.tagLength,
			additionalData: associatedData(protection),
		},
		key,
		asArrayBuffer(new TextEncoder().encode(JSON.stringify(payload))),
	)

	return {
		fileName: BACKUP_FILE_NAME,
		document: protectedBackupSchema.parse({
			format: FORMAT,
			version: VERSION,
			protection,
			ciphertext: encodeBase64Url(new Uint8Array(ciphertext)),
		}),
	}
}

export async function openRahrowBackup(
	input: string | unknown,
	password?: string,
): Promise<RahrowBackupPayload> {
	const document = parseDocument(input)

	if ('payload' in document) {
		return document.payload
	}
	if (password === undefined) {
		throw new BackupError(
			'password_required',
			'This RahRow backup requires a password',
		)
	}

	let plaintext: ArrayBuffer
	try {
		assertPassword(password)
		const key = await derivePasswordKey(password, document.protection)
		plaintext = await cryptoApi().subtle.decrypt(
			{
				name: 'AES-GCM',
				iv: asArrayBuffer(decodeBase64Url(document.protection.cipher.iv)),
				tagLength: document.protection.cipher.tagLength,
				additionalData: associatedData(document.protection),
			},
			key,
			asArrayBuffer(decodeBase64Url(document.ciphertext)),
		)
	} catch (error) {
		if (error instanceof BackupError && error.code === 'password_required') {
			throw error
		}
		throw new BackupError(
			'authentication_failed',
			'The backup password is incorrect or the backup is corrupted',
			{ cause: error },
		)
	}

	try {
		return parsePayload(
			JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(plaintext)),
		)
	} catch (error) {
		if (error instanceof BackupError) throw error
		throw new BackupError('invalid_backup', 'Backup payload is malformed', {
			cause: error,
		})
	}
}

export type BackupConflictPolicy = 'reject' | 'replace' | 'keep-existing'
export interface BackupConflict {
	readonly area: 'connections' | 'settings'
	readonly key: string
	readonly kind: 'duplicate' | 'conflict' | 'missing-profile-reference'
}

export interface PlanRahrowBackupImportInput {
	readonly document: string | unknown
	readonly password?: string
	readonly currentConnections: readonly ConnectionProfile[]
	readonly currentSettings: Settings
	readonly connectionConflict?: BackupConflictPolicy
	readonly settingConflict?: BackupConflictPolicy
}

export interface RahrowBackupImportPlan {
	readonly canApply: boolean
	readonly conflicts: readonly BackupConflict[]
	readonly previousConnections: readonly ConnectionProfile[]
	readonly previousSettings: Settings
	readonly nextConnections: readonly ConnectionProfile[]
	readonly nextSettings: Settings
	readonly importsConnections: boolean
	readonly importsSettings: boolean
}

export async function planRahrowBackupImport(
	input: PlanRahrowBackupImportInput,
): Promise<RahrowBackupImportPlan> {
	const payload = await openRahrowBackup(input.document, input.password)
	const connectionPolicy = input.connectionConflict ?? 'reject'
	const settingPolicy = input.settingConflict ?? 'reject'
	const conflicts: BackupConflict[] = []
	const nextById = new Map(
		input.currentConnections.map((profile) => [profile.id, profile] as const),
	)

	for (const incoming of payload.connections ?? []) {
		const existing = nextById.get(incoming.id)
		if (!existing) {
			nextById.set(incoming.id, parseConnectionProfile(incoming))
			continue
		}
		if (sameJson(existing, incoming)) {
			conflicts.push({ area: 'connections', key: incoming.id, kind: 'duplicate' })
			continue
		}

		conflicts.push({ area: 'connections', key: incoming.id, kind: 'conflict' })
		if (connectionPolicy === 'replace') {
			nextById.set(incoming.id, parseConnectionProfile(incoming))
		}
	}

	const nextSettings: Record<string, unknown> = { ...input.currentSettings }
	for (const [key, incoming] of Object.entries(payload.settings ?? {})) {
		const existing = nextSettings[key]
		if (existing === undefined || sameJson(existing, incoming)) {
			nextSettings[key] = incoming
			continue
		}

		conflicts.push({ area: 'settings', key, kind: 'conflict' })
		if (settingPolicy === 'replace') {
			nextSettings[key] = incoming
		}
	}

	const nextConnections = [...nextById.values()].sort((a, b) =>
		a.id.localeCompare(b.id),
	)
	const parsedSettings = parseSettings(nextSettings)
	if (
		payload.settings?.activeProfileId !== undefined &&
		parsedSettings.activeProfileId &&
		!nextById.has(parsedSettings.activeProfileId)
	) {
		conflicts.push({
			area: 'settings',
			key: 'activeProfileId',
			kind: 'missing-profile-reference',
		})
	}

	const hasUnresolved = conflicts.some(
		(conflict) =>
			conflict.kind === 'missing-profile-reference' ||
			(conflict.kind === 'conflict' &&
				(conflict.area === 'connections'
					? connectionPolicy === 'reject'
					: settingPolicy === 'reject')),
	)

	return {
		canApply: !hasUnresolved,
		conflicts,
		previousConnections: input.currentConnections.map(parseConnectionProfile),
		previousSettings: parseSettings(input.currentSettings),
		nextConnections,
		nextSettings: parsedSettings,
		importsConnections: payload.connections !== undefined,
		importsSettings: payload.settings !== undefined,
	}
}

export async function applyRahrowBackupImport(
	plan: RahrowBackupImportPlan,
	stores: {
		readonly profileStore: ProfileStore
		readonly settingsStore: SettingsStore
		readonly subscriptionStore?: Pick<SubscriptionStore, 'list'>
	},
): Promise<void> {
	if (!plan.canApply) {
		throw new BackupError(
			'unresolved_conflicts',
			'The backup import has unresolved conflicts',
		)
	}
	if (plan.importsConnections && !stores.profileStore.replaceAll) {
		throw new BackupError(
			'atomic_import_unsupported',
			'The profile store does not support atomic replacement',
		)
	}

	const [currentConnections, currentSettings, currentSubscriptions] =
		await Promise.all([
			stores.profileStore.list(),
			stores.settingsStore.read(),
			stores.subscriptionStore?.list() ?? Promise.resolve([]),
		])
	const normalizedCurrentConnections = currentConnections
		.map(parseConnectionProfile)
		.sort((a, b) => a.id.localeCompare(b.id))
	const normalizedPreviousConnections = [...plan.previousConnections].sort(
		(a, b) => a.id.localeCompare(b.id),
	)
	if (
		(plan.importsConnections &&
			!sameJson(normalizedCurrentConnections, normalizedPreviousConnections)) ||
		(plan.importsSettings &&
			!sameJson(parseSettings(currentSettings), plan.previousSettings))
	) {
		throw new BackupError(
			'unresolved_conflicts',
			'The stored connections or settings changed after this import was planned',
		)
	}

	try {
		if (plan.importsConnections) {
			const lockedSubscriptionIds = protectedSubscriptionIds(currentSubscriptions)
			const currentById = new Map(
				currentConnections.map((profile) => [profile.id, profile]),
			)
			const lockSafeConnections = plan.nextConnections.flatMap((profile) => {
				if (!isProfileProtectedByLock(profile, lockedSubscriptionIds)) {
					const current = currentById.get(profile.id)
					return current && isProfileProtectedByLock(current, lockedSubscriptionIds)
						? [current]
						: [profile]
				}
				const current = currentById.get(profile.id)
				return current ? [current] : []
			})
			for (const profile of currentConnections) {
				if (
					isProfileProtectedByLock(profile, lockedSubscriptionIds) &&
					!lockSafeConnections.some(({ id }) => id === profile.id)
				) {
					lockSafeConnections.push(profile)
				}
			}
			await stores.profileStore.replaceAll?.(
				lockSafeConnections.sort((left, right) => left.id.localeCompare(right.id)),
			)
		}
		if (plan.importsSettings) {
			await stores.settingsStore.write(plan.nextSettings)
		}
	} catch (error) {
		const rollbackErrors: unknown[] = []
		if (plan.importsSettings) {
			try {
				await stores.settingsStore.write(plan.previousSettings)
			} catch (rollbackError) {
				rollbackErrors.push(rollbackError)
			}
		}
		if (plan.importsConnections) {
			try {
				await stores.profileStore.replaceAll?.(plan.previousConnections)
			} catch (rollbackError) {
				rollbackErrors.push(rollbackError)
			}
		}

		throw new BackupError(
			'atomic_import_failed',
			rollbackErrors.length === 0
				? 'The backup import failed and all changes were rolled back'
				: 'The backup import failed and rollback was incomplete',
			{
				cause:
					rollbackErrors.length === 0
						? error
						: new AggregateError([error, ...rollbackErrors]),
			},
		)
	}
}

function selectPayload(input: CreateRahrowBackupInput): RahrowBackupPayload {
	const createdAt = input.createdAt ?? new Date().toISOString()
	const all = input.selection === 'all'
	const selectedIds = new Set(
		all ? input.connections.map(({ id }) => id) : input.selection.connectionIds,
	)
	const selectedSettingKeys = all
		? BACKUP_SETTING_KEYS
		: (input.selection.settingKeys ?? [])
	const payload: Record<string, unknown> = {
		version: PAYLOAD_VERSION,
		createdAt,
	}
	if (!all && input.selection.connectionIds) {
		const availableIds = new Set(input.connections.map(({ id }) => id))
		const missingIds = input.selection.connectionIds.filter(
			(id) => !availableIds.has(id),
		)
		if (missingIds.length > 0) {
			throw new BackupError(
				'invalid_selection',
				`Selected connection ids were not found: ${missingIds.join(', ')}`,
			)
		}
	}

	if (all || input.selection.connectionIds !== undefined) {
		payload.connections = input.connections
			.filter(({ id }) => selectedIds.has(id))
			.map(parseConnectionProfile)
	}
	if (all || input.selection.settingKeys !== undefined) {
		payload.settings = Object.fromEntries(
			selectedSettingKeys.flatMap((key) =>
				input.settings[key] === undefined ? [] : [[key, input.settings[key]]],
			),
		)
	}

	return backupPayloadSchema.parse(payload)
}

function parseDocument(input: string | unknown): RahrowBackupDocument {
	let parsed: unknown
	try {
		if (typeof input === 'string') {
			if (input.length > MAX_DOCUMENT_LENGTH)
				throw new Error('Backup is too large')
			parsed = JSON.parse(input)
		} else {
			parsed = input
		}
	} catch (error) {
		throw new BackupError('invalid_backup', 'Backup is not valid JSON', {
			cause: error,
		})
	}

	if (parsed && typeof parsed === 'object' && 'version' in parsed) {
		const version = (parsed as { version?: unknown }).version
		if (typeof version === 'number' && version > VERSION) {
			throw new BackupError(
				'unsupported_version',
				`Backup version ${version} is newer than this RahRow build supports`,
			)
		}
	}
	if (
		parsed &&
		typeof parsed === 'object' &&
		'payload' in parsed &&
		(parsed as { payload?: { version?: unknown } }).payload?.version !== undefined
	) {
		assertSupportedPayloadVersion(
			(parsed as { payload: { version?: unknown } }).payload.version,
		)
	}

	try {
		if (
			parsed &&
			typeof parsed === 'object' &&
			'protection' in parsed &&
			(parsed as { protection?: { mode?: unknown } }).protection?.mode === 'none'
		) {
			return plaintextBackupSchema.parse(parsed)
		}
		return protectedBackupSchema.parse(parsed)
	} catch (error) {
		throw new BackupError('invalid_backup', 'Backup envelope is malformed', {
			cause: error,
		})
	}
}

function parsePayload(input: unknown): RahrowBackupPayload {
	if (input && typeof input === 'object' && 'version' in input) {
		assertSupportedPayloadVersion((input as { version?: unknown }).version)
	}
	try {
		return backupPayloadSchema.parse(input)
	} catch (error) {
		throw new BackupError('invalid_backup', 'Backup payload is malformed', {
			cause: error,
		})
	}
}

function assertSupportedPayloadVersion(version: unknown) {
	if (typeof version === 'number' && version > PAYLOAD_VERSION) {
		throw new BackupError(
			'unsupported_version',
			`Backup payload version ${version} is newer than this RahRow build supports`,
		)
	}
}

async function derivePasswordKey(
	password: string,
	protection: z.infer<typeof passwordProtectionSchema>,
) {
	const crypto = cryptoApi()
	const material = await crypto.subtle.importKey(
		'raw',
		asArrayBuffer(new TextEncoder().encode(password.normalize('NFC'))),
		'PBKDF2',
		false,
		['deriveKey'],
	)

	return crypto.subtle.deriveKey(
		{
			name: 'PBKDF2',
			hash: protection.kdf.hash,
			iterations: protection.kdf.iterations,
			salt: asArrayBuffer(decodeBase64Url(protection.kdf.salt)),
		},
		material,
		{ name: 'AES-GCM', length: protection.cipher.keyLength },
		false,
		['encrypt', 'decrypt'],
	)
}

function associatedData(
	protection: z.infer<typeof passwordProtectionSchema>,
): ArrayBuffer {
	return asArrayBuffer(
		new TextEncoder().encode(
			JSON.stringify({ format: FORMAT, version: VERSION, protection }),
		),
	)
}

function assertPassword(password: string) {
	if (password.length === 0 || password.length > 1024) {
		throw new BackupError(
			'password_required',
			'Backup password must contain between 1 and 1024 characters',
		)
	}
}

function cryptoApi(): Crypto {
	if (!globalThis.crypto?.subtle) {
		throw new BackupError(
			'invalid_backup',
			'This platform does not provide the Web Crypto API',
		)
	}
	return globalThis.crypto
}

function encodeBase64Url(input: Uint8Array): string {
	let binary = ''
	for (const byte of input) binary += String.fromCharCode(byte)
	return btoa(binary)
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replace(/=+$/u, '')
}

function decodeBase64Url(input: string): Uint8Array {
	if (!/^[A-Za-z0-9_-]+$/u.test(input)) throw new Error('Invalid base64url')
	const base64 = input.replaceAll('-', '+').replaceAll('_', '/')
	const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
	const binary = atob(padded)
	return Uint8Array.from(binary, (character) => character.charCodeAt(0))
}

function asArrayBuffer(input: Uint8Array): ArrayBuffer {
	return Uint8Array.from(input).buffer
}

function sameJson(left: unknown, right: unknown) {
	return JSON.stringify(left) === JSON.stringify(right)
}
