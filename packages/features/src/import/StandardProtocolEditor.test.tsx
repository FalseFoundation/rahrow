// @vitest-environment jsdom

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

import { StandardProtocolEditor } from './StandardProtocolEditor.tsx'

afterEach(cleanup)

async function fillRequiredVlessFields(
	user: ReturnType<typeof userEvent.setup>,
) {
	await user.type(
		screen.getByRole('textbox', { name: 'Server' }),
		'edge.example.com',
	)
	await user.type(
		screen.getByRole('textbox', { name: 'User ID' }),
		'11111111-1111-4111-8111-111111111111',
	)
}

describe('StandardProtocolEditor', () => {
	it('associates invalid port and missing protocol credential errors', async () => {
		const onSave = vi.fn(async (_profile: ConnectionProfile) => undefined)
		const user = userEvent.setup()
		render(<StandardProtocolEditor protocol='vless' onSave={onSave} />)

		await user.type(
			screen.getByRole('textbox', { name: 'Server' }),
			'edge.example.com',
		)
		await user.clear(screen.getByRole('textbox', { name: 'Port' }))
		await user.type(screen.getByRole('textbox', { name: 'Port' }), '0')
		await user.click(
			screen.getByRole('button', { name: 'Create VLESS connection' }),
		)

		expect(screen.getByText('Enter a port from 1 to 65535')).toBeTruthy()
		expect(screen.getByText('User ID is required')).toBeTruthy()
		expect(
			screen.getByRole('textbox', { name: 'Port' }).getAttribute('aria-invalid'),
		).toBe('true')
		expect(onSave).not.toHaveBeenCalled()
	})

	it('switches credential labels, TLS visibility, and defaults with protocol', async () => {
		const user = userEvent.setup()
		const { rerender } = render(
			<StandardProtocolEditor protocol='vless' onSave={async () => undefined} />,
		)

		await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Temporary')
		await user.selectOptions(
			screen.getByRole('combobox', { name: 'Security' }),
			'none',
		)
		expect(
			screen.queryByRole('textbox', { name: 'Server name (SNI)' }),
		).toBeNull()

		rerender(
			<StandardProtocolEditor protocol='trojan' onSave={async () => undefined} />,
		)

		await waitFor(() =>
			expect(
				(screen.getByRole('textbox', { name: 'Name' }) as HTMLInputElement).value,
			).toBe(''),
		)
		expect(screen.getByLabelText('Password').getAttribute('type')).toBe(
			'password',
		)
		expect(
			screen.getByRole('textbox', { name: 'Server name (SNI)' }),
		).toBeTruthy()
	})

	it('saves the same canonical VLESS semantics through typed form values', async () => {
		const onSave = vi.fn(async (_profile: ConnectionProfile) => undefined)
		const user = userEvent.setup()
		render(<StandardProtocolEditor protocol='vless' onSave={onSave} />)

		await user.type(screen.getByRole('textbox', { name: 'Name' }), 'Edge')
		await fillRequiredVlessFields(user)
		await user.clear(screen.getByRole('textbox', { name: 'Port' }))
		await user.type(screen.getByRole('textbox', { name: 'Port' }), '8443')
		await user.type(
			screen.getByRole('textbox', { name: 'Server name (SNI)' }),
			'sni.example.com',
		)
		await user.click(
			screen.getByRole('button', { name: 'Create VLESS connection' }),
		)

		await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
		expect(onSave.mock.calls[0]?.[0]).toMatchObject({
			protocol: 'vless',
			endpoint: { host: 'edge.example.com', port: 8443 },
			security: { type: 'tls', serverName: 'sni.example.com' },
			authentication: { id: '11111111-1111-4111-8111-111111111111' },
			metadata: { name: 'Edge', source: 'manual' },
		})
	})

	it('prevents double submission and publishes async saving state', async () => {
		let release: () => void = () => undefined
		const pending = new Promise<void>((resolve) => {
			release = resolve
		})
		const onSave = vi.fn(async (_profile: ConnectionProfile) => pending)
		const onSavingChange = vi.fn()
		const user = userEvent.setup()
		render(
			<StandardProtocolEditor
				protocol='vless'
				onSave={onSave}
				onSavingChange={onSavingChange}
			/>,
		)
		await fillRequiredVlessFields(user)
		const form = screen
			.getByRole('button', { name: 'Create VLESS connection' })
			.closest('form')
		if (!form) throw new Error('Expected standard protocol form')

		fireEvent.submit(form)
		fireEvent.submit(form)

		await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
		expect(onSavingChange).toHaveBeenCalledWith(true)
		expect(
			(screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement)
				.disabled,
		).toBe(true)
		release()
		await waitFor(() => expect(onSavingChange).toHaveBeenLastCalledWith(false))
	})

	it('retains values and associates an async form failure', async () => {
		const onSave = vi.fn(async (_profile: ConnectionProfile) => {
			throw new Error('Profile could not be persisted')
		})
		const user = userEvent.setup()
		render(<StandardProtocolEditor protocol='vless' onSave={onSave} />)
		await fillRequiredVlessFields(user)

		await user.click(
			screen.getByRole('button', { name: 'Create VLESS connection' }),
		)

		const alert = await screen.findByRole('alert')
		expect(alert.textContent).toBe('Profile could not be persisted')
		expect(screen.getByDisplayValue('edge.example.com')).toBeTruthy()
		expect(
			screen
				.getByRole('button', { name: 'Create VLESS connection' })
				.getAttribute('aria-describedby'),
		).toBe(alert.id)
	})
})
