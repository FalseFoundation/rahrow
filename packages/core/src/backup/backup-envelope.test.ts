import { describe, expect, it } from 'vitest'

import type { ConnectionProfile } from '../profile/connection-profile.ts'
import {
	applyRahrowBackupImport,
	BACKUP_FILE_NAME,
	BackupError,
	createRahrowBackup,
	openRahrowBackup,
	PLAINTEXT_BACKUP_WARNING,
	planRahrowBackupImport,
	rahrowBackupEnvelopeSchema,
} from './backup-envelope.ts'

const alpha: ConnectionProfile = {
	id: 'alpha',
	protocol: 'trojan',
	endpoint: { host: 'alpha.example.com', port: 443 },
	authentication: { password: 'alpha-secret' },
	metadata: { source: 'subscription', subscriptionId: 'main' },
}

const beta: ConnectionProfile = {
	...alpha,
	id: 'beta',
	endpoint: { host: 'beta.example.com', port: 443 },
	authentication: { password: 'beta-secret' },
	metadata: { source: 'manual' },
}

describe('RahRow backup envelope', () => {
	it('exports only selected data and warns when secrets are plaintext', async () => {
		const backup = await createRahrowBackup({
			connections: [alpha, beta],
			settings: { engineId: 'xray', theme: 'dark', language: 'fa' },
			selection: { connectionIds: ['alpha'], settingKeys: ['theme'] },
			createdAt: '2026-09-02T00:00:00.000Z',
		})

		expect(backup.fileName).toBe(BACKUP_FILE_NAME)
		expect(backup.warning).toBe(PLAINTEXT_BACKUP_WARNING)
		expect(backup.document).toMatchObject({
			format: 'rahrow-backup',
			version: 1,
			protection: { mode: 'none' },
			warning: PLAINTEXT_BACKUP_WARNING,
			payload: {
				connections: [
					{ id: 'alpha', authentication: { password: 'alpha-secret' } },
				],
				settings: { theme: 'dark' },
			},
		})
		expect(await openRahrowBackup(JSON.stringify(backup.document))).toEqual(
			backup.document.payload,
		)
	})

	it('authenticates encrypted backups without storing the password', async () => {
		const backup = await createRahrowBackup({
			connections: [alpha],
			settings: { engineId: 'xray' },
			selection: 'all',
			password: 'correct horse battery staple',
			createdAt: '2026-09-02T00:00:00.000Z',
		})

		const serialized = JSON.stringify(backup.document)
		expect(rahrowBackupEnvelopeSchema.safeParse(backup.document).success).toBe(
			true,
		)
		expect(serialized).not.toContain('correct horse')
		expect(serialized).not.toContain('alpha-secret')
		expect(backup.warning).toBeUndefined()
		expect(
			await openRahrowBackup(serialized, 'correct horse battery staple'),
		).toMatchObject({ connections: [{ id: 'alpha' }] })

		await expect(
			openRahrowBackup(serialized, 'wrong password'),
		).rejects.toMatchObject({
			code: 'authentication_failed',
		})

		const corrupted = JSON.parse(serialized)
		corrupted.ciphertext = `${corrupted.ciphertext[0] === 'A' ? 'B' : 'A'}${corrupted.ciphertext.slice(1)}`
		await expect(
			openRahrowBackup(JSON.stringify(corrupted), 'correct horse battery staple'),
		).rejects.toMatchObject({ code: 'authentication_failed' })
	})

	it('rejects malformed and future documents safely', async () => {
		await expect(openRahrowBackup('{')).rejects.toBeInstanceOf(BackupError)
		await expect(
			openRahrowBackup(JSON.stringify({ format: 'rahrow-backup', version: 2 })),
		).rejects.toMatchObject({ code: 'unsupported_version' })
		await expect(
			openRahrowBackup({
				format: 'rahrow-backup',
				version: 1,
				protection: { mode: 'none' },
				warning: PLAINTEXT_BACKUP_WARNING,
				payload: { version: 2 },
			}),
		).rejects.toMatchObject({ code: 'unsupported_version' })
	})

	it('rejects a selected connection id that is not present', async () => {
		await expect(
			createRahrowBackup({
				connections: [alpha],
				settings: {},
				selection: { connectionIds: ['missing'] },
			}),
		).rejects.toMatchObject({ code: 'invalid_selection' })
	})
})

describe('RahRow backup import plan', () => {
	it('reports duplicates and blocks unresolved conflicts without losing ownership', async () => {
		const payload = (
			await createRahrowBackup({
				connections: [alpha, beta],
				settings: { theme: 'dark', activeProfileId: 'alpha' },
				selection: 'all',
			})
		).document
		const plan = await planRahrowBackupImport({
			document: payload,
			currentConnections: [
				alpha,
				{ ...beta, endpoint: { host: 'changed.example.com', port: 443 } },
			],
			currentSettings: { theme: 'light' },
		})

		expect(plan.canApply).toBe(false)
		expect(plan.conflicts).toEqual(
			expect.arrayContaining([
				{ area: 'connections', key: 'alpha', kind: 'duplicate' },
				{ area: 'connections', key: 'beta', kind: 'conflict' },
				{ area: 'settings', key: 'theme', kind: 'conflict' },
			]),
		)
		expect(
			plan.nextConnections.find(({ id }) => id === 'alpha')?.metadata,
		).toEqual(alpha.metadata)
	})

	it('applies a resolved plan and rolls both stores back when a write fails', async () => {
		const document = (
			await createRahrowBackup({
				connections: [beta],
				settings: { theme: 'dark' },
				selection: 'all',
			})
		).document
		const plan = await planRahrowBackupImport({
			document,
			currentConnections: [alpha],
			currentSettings: { theme: 'light' },
			connectionConflict: 'replace',
			settingConflict: 'replace',
		})
		const connectionWrites: ConnectionProfile[][] = []
		const settingsWrites: unknown[] = []

		await expect(
			applyRahrowBackupImport(plan, {
				profileStore: {
					list: async () => (alpha ? [alpha] : []),
					get: async () => null,
					save: async () => undefined,
					remove: async () => undefined,
					replaceAll: async (profiles) => {
						connectionWrites.push([...profiles])
					},
				},
				settingsStore: {
					read: async () => ({ theme: 'light' }),
					write: async (settings) => {
						settingsWrites.push(settings)
						if (settings.theme === 'dark') throw new Error('disk full')
					},
				},
			}),
		).rejects.toMatchObject({ code: 'atomic_import_failed' })

		expect(connectionWrites).toEqual([[alpha, beta], [alpha]])
		expect(settingsWrites).toEqual([
			{ engineId: 'sing-box', connectionMode: 'vpn', theme: 'dark' },
			{ engineId: 'sing-box', connectionMode: 'vpn', theme: 'light' },
		])
	})

	it('refuses to apply a stale plan before writing either store', async () => {
		const document = (
			await createRahrowBackup({
				connections: [beta],
				settings: {},
				selection: { connectionIds: ['beta'] },
			})
		).document
		const plan = await planRahrowBackupImport({
			document,
			currentConnections: [alpha],
			currentSettings: {},
		})
		let writes = 0

		await expect(
			applyRahrowBackupImport(plan, {
				profileStore: {
					list: async () => [
						{ ...alpha, endpoint: { host: 'new.example.com', port: 443 } },
					],
					get: async () => null,
					save: async () => undefined,
					remove: async () => undefined,
					replaceAll: async () => {
						writes += 1
					},
				},
				settingsStore: {
					read: async () => ({ engineId: 'sing-box', connectionMode: 'vpn' }),
					write: async () => {
						writes += 1
					},
				},
			}),
		).rejects.toMatchObject({ code: 'unresolved_conflicts' })
		expect(writes).toBe(0)
	})

	it('preserves descendants of locked subscriptions during conflict replacement', async () => {
		const locked = {
			...alpha,
			metadata: { source: 'subscription' as const, subscriptionId: 'locked' },
		}
		const incoming = {
			...locked,
			endpoint: { host: 'replacement.example.com', port: 443 },
		}
		const document = (
			await createRahrowBackup({
				connections: [incoming],
				settings: {},
				selection: 'all',
			})
		).document
		const plan = await planRahrowBackupImport({
			document,
			currentConnections: [locked],
			currentSettings: {},
			connectionConflict: 'replace',
		})
		let written: readonly ConnectionProfile[] = []

		await applyRahrowBackupImport(plan, {
			profileStore: {
				list: async () => [locked],
				get: async () => locked,
				save: async () => undefined,
				remove: async () => undefined,
				replaceAll: async (profiles) => {
					written = profiles
				},
			},
			settingsStore: {
				read: async () => ({ engineId: 'sing-box', connectionMode: 'vpn' }),
				write: async () => undefined,
			},
			subscriptionStore: {
				list: async () => [
					{ id: 'locked', url: 'https://locked.example', locked: true },
				],
			},
		})

		expect(written).toEqual([locked])
	})
})
