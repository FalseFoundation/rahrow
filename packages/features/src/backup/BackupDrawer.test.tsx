import type { FilePick, FileSave } from '@rahrow/core/platform/capabilities.ts'
import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import {
	JsonProfileStore,
	JsonSettingsStore,
	MemoryDocumentStore,
} from '@rahrow/core/storage/json-store.ts'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { BackupDrawer } from './BackupDrawer.tsx'

const alpha: ConnectionProfile = {
	id: 'alpha',
	protocol: 'trojan',
	endpoint: { host: 'alpha.example.com', port: 443 },
	authentication: { password: 'alpha-secret' },
	metadata: { name: 'Alpha', source: 'manual' },
}

const beta: ConnectionProfile = {
	...alpha,
	id: 'beta',
	endpoint: { host: 'beta.example.com', port: 443 },
	authentication: { password: 'beta-secret' },
	metadata: { name: 'Beta', source: 'manual' },
}

afterEach(cleanup)

async function stores() {
	const profileStore = new JsonProfileStore(new MemoryDocumentStore())
	const settingsStore = new JsonSettingsStore(new MemoryDocumentStore())
	await profileStore.replaceAll([alpha, beta])
	await settingsStore.write({ theme: 'dark', engineId: 'xray' })
	return { profileStore, settingsStore }
}

describe('BackupDrawer', () => {
	it('exports selected connections as a clearly warned plaintext backup', async () => {
		const { profileStore, settingsStore } = await stores()
		const save = vi.fn<FileSave['save']>(async () => 'saved' as const)
		const user = userEvent.setup()
		const recordActionEvent = vi.fn(async () => ({
			status: 'recorded' as const,
			obligation: null,
		}))
		render(
			<BackupDrawer
				open
				onOpenChange={vi.fn()}
				profileStore={profileStore}
				settingsStore={settingsStore}
				fileSave={{ save } satisfies FileSave}
				adGate={{ recordActionEvent } as never}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'Export backup' }))
		await user.click(screen.getByRole('radio', { name: 'Connections only' }))
		await user.click(screen.getByRole('checkbox', { name: /Beta/ }))
		await user.click(screen.getByRole('radio', { name: 'Plaintext' }))

		expect(screen.getByRole('alert').textContent).toContain('sensitive')
		await user.click(screen.getByRole('button', { name: 'Save backup' }))

		await waitFor(() => expect(save).toHaveBeenCalledOnce())
		const input = save.mock.calls[0]?.[0]
		expect(input?.filename).toBe('rahrow-backup.json')
		const text = decodeURIComponent(input?.dataUrl.split(',')[1] ?? '')
		expect(text).toContain('alpha-secret')
		expect(text).not.toContain('beta-secret')
		expect(recordActionEvent).toHaveBeenCalledWith({
			id: expect.any(String),
			action: 'backup-export',
			outcome: 'completed',
		})
	})

	it('encrypts the saved document and never includes its password', async () => {
		const { profileStore, settingsStore } = await stores()
		const save = vi.fn<FileSave['save']>(async () => 'saved' as const)
		const user = userEvent.setup()
		render(
			<BackupDrawer
				open
				onOpenChange={vi.fn()}
				profileStore={profileStore}
				settingsStore={settingsStore}
				fileSave={{ save }}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'Export backup' }))
		await user.type(screen.getByLabelText('Backup password'), 'correct horse')
		await user.type(
			screen.getByLabelText('Confirm backup password'),
			'correct horse',
		)
		await user.click(screen.getByRole('button', { name: 'Save backup' }))

		await waitFor(() => expect(save).toHaveBeenCalledOnce())
		const text = decodeURIComponent(
			save.mock.calls[0]?.[0].dataUrl.split(',')[1] ?? '',
		)
		expect(text).toContain('AES-GCM')
		expect(text).not.toContain('correct horse')
		expect(text).not.toContain('alpha-secret')
	})

	it('previews conflicts without secrets and applies the selected resolution', async () => {
		const { profileStore, settingsStore } = await stores()
		const incomingStore = new JsonProfileStore(new MemoryDocumentStore())
		await incomingStore.replaceAll([
			{ ...alpha, endpoint: { host: 'replacement.example.com', port: 443 } },
		])
		const { createRahrowBackup } = await import(
			'@rahrow/core/backup/backup-envelope.ts'
		)
		const document = await createRahrowBackup({
			connections: await incomingStore.list(),
			settings: {},
			selection: { connectionIds: ['alpha'] },
		})
		const pick: FilePick = {
			pick: vi.fn(async () => ({
				filename: 'rahrow-backup.json',
				text: JSON.stringify(document.document),
			})),
		}
		const user = userEvent.setup()
		const recordActionEvent = vi.fn(async () => ({
			status: 'recorded' as const,
			obligation: null,
		}))
		render(
			<BackupDrawer
				open
				onOpenChange={vi.fn()}
				profileStore={profileStore}
				settingsStore={settingsStore}
				filePick={pick}
				adGate={{ recordActionEvent } as never}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'Import backup' }))
		await screen.findByText('1 conflict')
		expect(screen.queryByText('alpha-secret')).toBeNull()
		await user.click(screen.getByRole('radio', { name: 'Replace existing' }))
		await user.click(screen.getByRole('button', { name: 'Import backup' }))

		await waitFor(async () =>
			expect((await profileStore.get('alpha'))?.endpoint.host).toBe(
				'replacement.example.com',
			),
		)
		expect(recordActionEvent).toHaveBeenCalledWith({
			id: expect.any(String),
			action: 'backup-import',
			outcome: 'completed',
		})
	})
})
