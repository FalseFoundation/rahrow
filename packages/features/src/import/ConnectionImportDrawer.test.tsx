import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ConnectionImportDrawer } from './ConnectionImportDrawer.tsx'

afterEach(cleanup)

const renderDrawer = () => {
	const onPaste = vi.fn(async () => undefined)
	const onImportUrl = vi.fn(async () => undefined)
	const onScanQr = vi.fn(async () => undefined)

	render(
		<ConnectionImportDrawer
			value='https://example.com/subscription'
			onValueChange={() => undefined}
			onPaste={onPaste}
			onImportUrl={onImportUrl}
			onScanQr={onScanQr}
			qrPreview={<div role='img' aria-label='Live camera' />}
			supportedProtocols={['vless', 'trojan']}
			onCreateProfile={async () => undefined}
		/>,
	)

	return { onPaste, onImportUrl, onScanQr }
}

describe('ConnectionImportDrawer', () => {
	it('omits the paste helper when no clipboard action is available', () => {
		render(
			<ConnectionImportDrawer
				value=''
				onValueChange={() => undefined}
				onImportUrl={async () => undefined}
				supportedProtocols={['vless']}
				onCreateProfile={async () => undefined}
			/>,
		)

		expect(screen.queryByRole('button', { name: 'Paste' })).toBeNull()
	})

	it('uses one URL field with a paste helper', async () => {
		const { onPaste, onImportUrl } = renderDrawer()

		expect(
			screen.getByRole('textbox', { name: 'Connection or subscription URL' }),
		).toBeTruthy()
		fireEvent.click(screen.getByRole('button', { name: 'Paste' }))
		fireEvent.click(screen.getByRole('button', { name: 'Add connection' }))

		expect(onPaste).toHaveBeenCalledOnce()
		await waitFor(() => expect(onImportUrl).toHaveBeenCalledOnce())
	})

	it('submits URL acquisition as a native form when Enter is pressed', async () => {
		const { onImportUrl } = renderDrawer()
		const user = userEvent.setup()
		const input = screen.getByRole('textbox', {
			name: 'Connection or subscription URL',
		})

		expect(input.closest('form')).toBeTruthy()
		await user.type(input, '{Enter}')

		expect(onImportUrl).toHaveBeenCalledOnce()
	})

	it('validates the URL with the form schema before importing', async () => {
		const onImportUrl = vi.fn(async () => undefined)
		const user = userEvent.setup()
		render(
			<ConnectionImportDrawer
				value='not a URL'
				onValueChange={() => undefined}
				onPaste={async () => undefined}
				onImportUrl={onImportUrl}
				supportedProtocols={['vless']}
				onCreateProfile={async () => undefined}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'Add connection' }))

		expect(onImportUrl).not.toHaveBeenCalled()
		expect(
			screen.getByText('Enter a valid connection or subscription URL'),
		).toBeTruthy()
		expect(
			screen
				.getByRole('textbox', { name: 'Connection or subscription URL' })
				.getAttribute('aria-invalid'),
		).toBe('true')
	})

	it('keeps paste failures visible, recoverable, and technically secondary', async () => {
		render(
			<ConnectionImportDrawer
				value=''
				onValueChange={() => undefined}
				onPaste={async () => {
					throw { message: 'clipboard.read denied by native bridge' }
				}}
				onImportUrl={async () => undefined}
				supportedProtocols={['vless']}
				onCreateProfile={async () => undefined}
			/>,
		)

		fireEvent.click(screen.getByRole('button', { name: 'Paste' }))

		const alert = await screen.findByRole('alert')
		expect(alert.textContent).toContain('Could not paste from the clipboard')
		expect(alert.textContent).toContain(
			'Allow clipboard access or enter the URL manually.',
		)
		const details = screen.getByText('Technical details').closest('details')
		expect(details?.open).toBe(false)
		expect(details?.textContent).not.toContain(
			'clipboard.read denied by native bridge',
		)
		expect(screen.getByRole('button', { name: 'Paste' })).toBeTruthy()
	})

	it('preserves the URL and exposes retry after an Enter-submit failure', async () => {
		const onImportUrl = vi
			.fn<() => Promise<void>>()
			.mockRejectedValueOnce(new Error('command rahrow_import not found'))
			.mockResolvedValueOnce(undefined)
		const user = userEvent.setup()
		render(
			<ConnectionImportDrawer
				value='vless://still-editable'
				onValueChange={() => undefined}
				onPaste={async () => undefined}
				onImportUrl={onImportUrl}
				supportedProtocols={['vless']}
				onCreateProfile={async () => undefined}
			/>,
		)
		const input = screen.getByRole('textbox', {
			name: 'Connection or subscription URL',
		}) as HTMLInputElement

		await user.type(input, '{Enter}')
		const alert = await screen.findByRole('alert')
		expect(alert.textContent).toContain('Could not add this connection')
		expect(input.value).toBe('vless://still-editable')
		expect(
			screen.getByText('Technical details').closest('details')?.textContent,
		).not.toContain('command rahrow_import not found')

		await user.click(screen.getByRole('button', { name: 'Add connection' }))
		await waitFor(() => expect(onImportUrl).toHaveBeenCalledTimes(2))
		await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
	})

	it('composes injected camera preview and protocol-first manual forms', () => {
		renderDrawer()

		fireEvent.click(screen.getByRole('tab', { name: 'QR' }))
		expect(screen.getByLabelText('Live camera')).toBeTruthy()

		fireEvent.click(screen.getByRole('tab', { name: 'Manual' }))
		expect(screen.getByLabelText('Protocol')).toBeTruthy()
		expect(
			screen.getByRole('button', { name: 'Create VLESS connection' }),
		).toBeTruthy()
	})

	it('offers only protocols supported by the selected engine manifest', () => {
		renderDrawer()
		fireEvent.click(screen.getByRole('tab', { name: 'Manual' }))

		const protocol = screen.getByRole('combobox', { name: 'Protocol' })
		expect(protocol.querySelectorAll('option')).toHaveLength(2)
		expect(screen.getByRole('option', { name: 'VLESS' })).toBeTruthy()
		expect(screen.getByRole('option', { name: 'TROJAN' })).toBeTruthy()
		expect(screen.queryByRole('option', { name: 'VMESS' })).toBeNull()
	})

	it('omits QR import when neither scanning nor preview is available', () => {
		render(
			<ConnectionImportDrawer
				value=''
				onValueChange={() => undefined}
				onPaste={async () => undefined}
				onImportUrl={async () => undefined}
				supportedProtocols={['vless']}
				onCreateProfile={async () => undefined}
			/>,
		)

		expect(screen.queryByRole('tab', { name: 'QR' })).toBeNull()
		expect(screen.queryByLabelText('QR camera preview')).toBeNull()
	})

	it('mounts the camera preview only while the QR method is active', async () => {
		const mounted = vi.fn()
		const unmounted = vi.fn()
		function Preview() {
			useEffect(() => {
				mounted()
				return unmounted
			}, [])
			return <div role='img' aria-label='Tracked camera' />
		}
		render(
			<ConnectionImportDrawer
				value=''
				onValueChange={() => undefined}
				onPaste={async () => undefined}
				onImportUrl={async () => undefined}
				qrPreview={<Preview />}
				supportedProtocols={['vless']}
				onCreateProfile={async () => undefined}
			/>,
		)

		expect(mounted).not.toHaveBeenCalled()
		fireEvent.click(screen.getByRole('tab', { name: 'QR' }))
		await waitFor(() => expect(mounted).toHaveBeenCalledOnce())
		fireEvent.click(screen.getByRole('tab', { name: 'URL' }))
		await waitFor(() => expect(unmounted).toHaveBeenCalledOnce())
	})

	it('locks duplicate QR scans and reports failure visibly', async () => {
		let rejectScan: ((reason?: unknown) => void) | undefined
		const onScanQr = vi.fn(
			() =>
				new Promise<void>((_resolve, reject) => {
					rejectScan = reject
				}),
		)
		render(
			<ConnectionImportDrawer
				value=''
				onValueChange={() => undefined}
				onPaste={async () => undefined}
				onImportUrl={async () => undefined}
				onScanQr={onScanQr}
				supportedProtocols={['vless']}
				onCreateProfile={async () => undefined}
			/>,
		)
		fireEvent.click(screen.getByRole('tab', { name: 'QR' }))
		const scan = screen.getByRole('button', { name: 'Scan QR code' })

		fireEvent.click(scan)
		fireEvent.click(scan)
		expect(onScanQr).toHaveBeenCalledOnce()
		rejectScan?.(new Error('Camera permission denied'))
		expect((await screen.findByRole('alert')).textContent).toContain(
			'Could not scan the QR code.',
		)
	})
})
