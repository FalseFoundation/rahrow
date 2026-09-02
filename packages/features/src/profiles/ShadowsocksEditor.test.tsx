// @vitest-environment jsdom

import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { parseConnectionProfile } from '@rahrow/core/profile/profile-schema.ts'
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ShadowsocksEditor } from './ShadowsocksEditor.tsx'

afterEach(cleanup)

function profile(
	id: string,
	host: string,
	method: 'aes-128-gcm' | '2022-blake3-aes-256-gcm',
): ConnectionProfile {
	return parseConnectionProfile({
		id,
		protocol: 'shadowsocks',
		endpoint: { host, port: 8443 },
		authentication: { method, password: `${id}-secret` },
		metadata: { name: `${id} name`, source: 'subscription', tags: ['work'] },
	})
}

async function fillCreateFields(user: ReturnType<typeof userEvent.setup>) {
	await user.type(
		screen.getByRole('textbox', { name: 'Server' }),
		'ss.example.com',
	)
	await user.type(screen.getByLabelText('Password or key'), 'secret-value')
}

describe('ShadowsocksEditor', () => {
	it('owns create defaults and saves a supported selected method', async () => {
		const onSave = vi.fn(async (_profile: ConnectionProfile) => undefined)
		const user = userEvent.setup()
		render(<ShadowsocksEditor onSave={onSave} />)

		expect(
			(screen.getByRole('textbox', { name: 'Port' }) as HTMLInputElement).value,
		).toBe('8388')
		expect(
			(screen.getByRole('combobox', { name: 'Method' }) as HTMLSelectElement)
				.value,
		).toBe('aes-256-gcm')
		await fillCreateFields(user)
		await user.selectOptions(
			screen.getByRole('combobox', { name: 'Method' }),
			'2022-blake3-aes-256-gcm',
		)
		await user.click(screen.getByRole('button', { name: 'Create profile' }))

		await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
		expect(onSave.mock.calls[0]?.[0]).toMatchObject({
			protocol: 'shadowsocks',
			endpoint: { host: 'ss.example.com', port: 8388 },
			authentication: {
				method: '2022-blake3-aes-256-gcm',
				password: 'secret-value',
			},
		})
	})

	it('resets edit defaults when the edited profile changes', async () => {
		const first = profile('first', 'first.example.com', 'aes-128-gcm')
		const second = profile(
			'second',
			'second.example.com',
			'2022-blake3-aes-256-gcm',
		)
		const user = userEvent.setup()
		const { rerender } = render(
			<ShadowsocksEditor profile={first} onSave={async () => undefined} />,
		)

		await user.clear(screen.getByRole('textbox', { name: 'Server' }))
		await user.type(
			screen.getByRole('textbox', { name: 'Server' }),
			'temporary.test',
		)
		rerender(
			<ShadowsocksEditor profile={second} onSave={async () => undefined} />,
		)

		await waitFor(() =>
			expect(
				(screen.getByRole('textbox', { name: 'Server' }) as HTMLInputElement).value,
			).toBe('second.example.com'),
		)
		expect(
			(screen.getByRole('combobox', { name: 'Method' }) as HTMLSelectElement)
				.value,
		).toBe('2022-blake3-aes-256-gcm')
		expect(
			(screen.getByLabelText('Password or key') as HTMLInputElement).value,
		).toBe('second-secret')
	})

	it('associates invalid port and required-password errors', async () => {
		const onSave = vi.fn(async (_profile: ConnectionProfile) => undefined)
		const user = userEvent.setup()
		render(<ShadowsocksEditor onSave={onSave} />)

		await user.type(
			screen.getByRole('textbox', { name: 'Server' }),
			'ss.example.com',
		)
		await user.clear(screen.getByRole('textbox', { name: 'Port' }))
		await user.type(screen.getByRole('textbox', { name: 'Port' }), '65536')
		await user.click(screen.getByRole('button', { name: 'Create profile' }))

		expect(screen.getByText('Enter a port from 1 to 65535')).toBeTruthy()
		expect(screen.getByText('Password or key is required')).toBeTruthy()
		expect(
			screen.getByRole('textbox', { name: 'Port' }).getAttribute('aria-invalid'),
		).toBe('true')
		expect(onSave).not.toHaveBeenCalled()
	})

	it('blocks duplicate pending saves and redacts secrets from failures', async () => {
		let rejectSave: (reason: Error) => void = () => undefined
		const pending = new Promise<void>((_resolve, reject) => {
			rejectSave = reject
		})
		const onSave = vi.fn(async (_profile: ConnectionProfile) => pending)
		const onSavingChange = vi.fn()
		const user = userEvent.setup()
		render(<ShadowsocksEditor onSave={onSave} onSavingChange={onSavingChange} />)
		await fillCreateFields(user)
		const form = screen
			.getByRole('button', { name: 'Create profile' })
			.closest('form')
		if (!form) throw new Error('Expected Shadowsocks editor form')

		fireEvent.submit(form)
		fireEvent.submit(form)
		await waitFor(() => expect(onSave).toHaveBeenCalledOnce())
		expect(onSavingChange).toHaveBeenCalledWith(true)
		expect(
			(screen.getByRole('button', { name: 'Saving…' }) as HTMLButtonElement)
				.disabled,
		).toBe(true)
		rejectSave(new Error('Could not store secret-value'))

		const alert = await screen.findByRole('alert')
		expect(alert.textContent).toBe("Couldn't save connection")
		expect(alert.textContent).not.toContain('secret-value')
		expect(onSavingChange).toHaveBeenLastCalledWith(false)
	})
})
