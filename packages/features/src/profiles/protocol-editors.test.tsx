import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { StandardProtocolEditor } from '../import/StandardProtocolEditor.tsx'
import { ConnectionProfileEditor } from './ConnectionProfileEditor.tsx'
import { SecureProtocolEditor } from './SecureProtocolEditor.tsx'
import { ShadowsocksEditor } from './ShadowsocksEditor.tsx'

afterEach(cleanup)

const vlessProfile: ConnectionProfile = {
	id: 'profile:vless',
	protocol: 'vless',
	endpoint: { host: 'old.example.com', port: 443 },
	authentication: { id: '00000000-0000-4000-8000-000000000000' },
	metadata: { name: 'Original', source: 'manual' },
}

describe('protocol editor validation', () => {
	it('focuses and durably describes the first invalid standard field', async () => {
		const onSave = vi.fn(async () => undefined)
		const user = userEvent.setup()
		render(<StandardProtocolEditor protocol='vless' onSave={onSave} />)

		await user.click(
			screen.getByRole('button', { name: 'Create VLESS connection' }),
		)

		const host = screen.getByRole('textbox', { name: 'Server' })
		await waitFor(() => expect(document.activeElement).toBe(host))
		expect(host.getAttribute('aria-invalid')).toBe('true')
		expect(host.getAttribute('aria-errormessage')).toBe('manual-host-error')
		expect(screen.getByText('Server is required').id).toBe('manual-host-error')
		expect(onSave).not.toHaveBeenCalled()
	})

	it('preserves Shadowsocks values and associates a save failure', async () => {
		const onSave = vi.fn(async () => {
			throw new Error('Profile could not be persisted')
		})
		const user = userEvent.setup()
		render(<ShadowsocksEditor onSave={onSave} />)

		await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Office')
		await user.type(
			screen.getByRole('textbox', { name: 'Server' }),
			'ss.example.com',
		)
		await user.clear(screen.getByRole('textbox', { name: 'Port' }))
		await user.type(screen.getByRole('textbox', { name: 'Port' }), '8388')
		await user.type(screen.getByLabelText('Password or key'), 'secret')
		await user.click(screen.getByRole('button', { name: 'Create profile' }))

		const alert = await screen.findByRole('alert')
		expect(alert.textContent).toContain("Couldn't save connection")
		expect(screen.getByDisplayValue('Office')).toBeTruthy()
		expect(screen.getByDisplayValue('ss.example.com')).toBeTruthy()
		expect(
			screen
				.getByRole('button', { name: 'Create profile' })
				.getAttribute('aria-describedby'),
		).toBe(alert.id)
	})

	it('switches secure protocol fields without leaking incompatible controls', async () => {
		const user = userEvent.setup()
		render(<SecureProtocolEditor onSave={async () => undefined} />)

		await user.selectOptions(
			screen.getByRole('combobox', { name: 'Protocol' }),
			'ssh',
		)

		expect(screen.getByRole('textbox', { name: 'Username' })).toBeTruthy()
		expect(screen.getByRole('textbox', { name: 'Pinned host key' })).toBeTruthy()
		expect(screen.queryByRole('textbox', { name: 'TLS server name' })).toBeNull()
		expect(screen.queryByRole('textbox', { name: 'Upload Mbps' })).toBeNull()
	})

	it('validates only the active secure protocol fields after switching', async () => {
		const onSave = vi.fn(async (_profile: ConnectionProfile) => undefined)
		const user = userEvent.setup()
		render(<SecureProtocolEditor onSave={onSave} />)

		await user.selectOptions(
			screen.getByRole('combobox', { name: 'Protocol' }),
			'ssh',
		)
		await user.type(
			screen.getByRole('textbox', { name: 'Server' }),
			'ssh.example.com',
		)
		await user.clear(screen.getByRole('textbox', { name: 'Port' }))
		await user.type(screen.getByRole('textbox', { name: 'Port' }), '22')
		await user.type(screen.getByRole('textbox', { name: 'Username' }), 'alice')
		await user.type(
			screen.getByRole('textbox', { name: 'Pinned host key' }),
			'ssh-ed25519 AAAA-test',
		)
		await user.type(screen.getByLabelText('Password'), 'secret')
		await user.click(screen.getByRole('button', { name: 'Create profile' }))

		await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
		expect(onSave.mock.calls[0]?.[0]).toMatchObject({
			protocol: 'ssh',
			endpoint: { host: 'ssh.example.com', port: 22 },
			authentication: {
				username: 'alice',
				password: 'secret',
				hostKey: 'ssh-ed25519 AAAA-test',
			},
		})
		expect(onSave.mock.calls[0]?.[0].hysteria).toBeUndefined()
	})

	it('exposes secure save errors and prevents duplicate pending submission', async () => {
		let rejectSave: (reason: Error) => void = () => {}
		const pending = new Promise<void>((_, reject) => {
			rejectSave = reject
		})
		const onSave = vi.fn(async (_profile: ConnectionProfile) => pending)
		const user = userEvent.setup()
		render(<SecureProtocolEditor onSave={onSave} />)
		await user.type(
			screen.getByRole('textbox', { name: 'Server' }),
			'hy2.example.com',
		)
		await user.type(screen.getByLabelText('Password'), 'secret')
		const button = screen.getByRole('button', { name: 'Create profile' })
		const form = button.closest('form')
		if (!form) throw new Error('Expected secure editor form')

		fireEvent.submit(form)
		fireEvent.submit(form)
		await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
		await waitFor(() => expect(button.hasAttribute('disabled')).toBe(true))
		rejectSave(new Error('Secure profile could not be persisted'))

		const alert = await screen.findByRole('alert')
		expect(alert.textContent).toContain('Secure profile could not be persisted')
		expect(button.getAttribute('aria-describedby')).toBe(alert.id)
	})

	it('validates and associates expert canonical JSON without discarding it', async () => {
		const user = userEvent.setup()
		render(
			<ConnectionProfileEditor
				profile={vlessProfile}
				onSave={async () => undefined}
			/>,
		)

		await user.click(screen.getByRole('tab', { name: 'Canonical JSON' }))
		const json = screen.getByLabelText('Canonical profile JSON')
		fireEvent.change(json, { target: { value: '{invalid' } })
		await user.click(screen.getByRole('button', { name: 'Validate and apply' }))

		expect(json.getAttribute('aria-invalid')).toBe('true')
		expect(json.getAttribute('aria-errormessage')).toBe(
			'profile-editor-json-error',
		)
		expect(screen.getByDisplayValue('{invalid')).toBeTruthy()
		expect(document.activeElement).toBe(json)
	})

	it('applies valid canonical JSON back to the field editor', async () => {
		const user = userEvent.setup()
		render(
			<ConnectionProfileEditor
				profile={vlessProfile}
				onSave={async () => undefined}
			/>,
		)

		await user.click(screen.getByRole('tab', { name: 'Canonical JSON' }))
		const json = screen.getByLabelText('Canonical profile JSON')
		fireEvent.change(json, {
			target: {
				value: JSON.stringify({
					...vlessProfile,
					endpoint: { host: 'applied.example.com', port: 8443 },
				}),
			},
		})
		await user.click(screen.getByRole('button', { name: 'Validate and apply' }))
		expect(screen.getByText('$.endpoint.host')).toBeTruthy()
		expect(screen.getByText('$.endpoint.port')).toBeTruthy()
		await user.click(screen.getByRole('button', { name: 'Validate and apply' }))
		await user.click(screen.getByRole('tab', { name: 'Fields' }))

		expect(screen.getByDisplayValue('applied.example.com')).toBeTruthy()
		expect(screen.getByDisplayValue('8443')).toBeTruthy()
	})

	it('locks duplicate save activation while a profile save is pending', async () => {
		let release: () => void = () => {}
		const pending = new Promise<void>((resolve) => {
			release = resolve
		})
		const onSave = vi.fn(async () => pending)
		const user = userEvent.setup()
		render(<ShadowsocksEditor onSave={onSave} />)
		await user.type(
			screen.getByRole('textbox', { name: 'Server' }),
			'ss.example.com',
		)
		await user.type(screen.getByLabelText('Password or key'), 'secret')
		const form = screen
			.getByRole('button', { name: 'Create profile' })
			.closest('form')
		if (!form) throw new Error('Expected editor form')

		fireEvent.submit(form)
		fireEvent.submit(form)
		await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
		release()
		await waitFor(() =>
			expect(screen.getByRole('button', { name: 'Create profile' })).toBeTruthy(),
		)
	})
})
