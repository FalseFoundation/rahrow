import type {
	Clipboard,
	FileSave,
	Share,
} from '@rahrow/core/platform/capabilities.ts'
import {
	Drawer,
	DrawerContent,
	DrawerTitle,
} from '@rahrow/ui/components/ui/drawer.tsx'
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const createQrDataUrl = vi.hoisted(() => vi.fn())
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))

vi.mock('./qr-image.ts', () => ({ createQrDataUrl }))
vi.mock('@rahrow/ui/components/ui/sonner.tsx', () => ({
	toast,
}))

import {
	ShareDrawerOutlet,
	type ShareDrawerPayload,
	ShareDrawerProvider,
	useShareDrawer,
} from './ShareDrawer.tsx'

const payload: ShareDrawerPayload = {
	title: 'Share connection',
	label: 'Connection link',
	value: 'vless://example',
}

function Harness({ value = payload }: { readonly value?: ShareDrawerPayload }) {
	const drawer = useShareDrawer()
	return (
		<button type='button' onClick={() => drawer.open(value)}>
			Open share
		</button>
	)
}

function NestedHarness() {
	const drawer = useShareDrawer()
	return (
		<Drawer open>
			<DrawerContent>
				<DrawerTitle>Connection actions</DrawerTitle>
				<button type='button' onClick={() => drawer.open(payload)}>
					Share from actions
				</button>
			</DrawerContent>
			<ShareDrawerOutlet />
		</Drawer>
	)
}

function renderShare(
	capabilities: {
		readonly clipboard: Clipboard
		readonly share?: Share
		readonly fileSave?: FileSave
	},
	value: ShareDrawerPayload = payload,
) {
	return render(
		<ShareDrawerProvider capabilities={capabilities}>
			<Harness value={value} />
		</ShareDrawerProvider>,
	)
}

describe('ShareDrawer', () => {
	beforeEach(() => {
		createQrDataUrl.mockReset().mockResolvedValue('data:image/png;base64,qr')
		toast.error.mockReset()
		toast.success.mockReset()
	})
	afterEach(cleanup)

	it('omits native sharing when the capability is absent and restores focus on close', async () => {
		const user = userEvent.setup()
		renderShare({ clipboard: { read: vi.fn(), write: vi.fn() } })
		const opener = screen.getByRole('button', { name: 'Open share' })

		await user.click(opener)
		expect(await screen.findByRole('dialog')).toBeTruthy()
		expect(screen.queryByRole('button', { name: 'Share' })).toBeNull()
		expect(screen.queryByRole('button', { name: 'Save QR code' })).toBeNull()

		await user.click(screen.getByRole('button', { name: 'Close share drawer' }))
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
		expect(document.activeElement).toBe(opener)
	})

	it('omits copy when the platform reports clipboard support unavailable', async () => {
		const user = userEvent.setup()
		renderShare({
			clipboard: { supported: false, read: vi.fn(), write: vi.fn() },
		})

		await user.click(screen.getByRole('button', { name: 'Open share' }))

		expect(screen.queryByRole('button', { name: 'Copy' })).toBeNull()
	})

	it('stacks a local share outlet above its open parent drawer', async () => {
		const user = userEvent.setup()
		render(
			<ShareDrawerProvider
				capabilities={{ clipboard: { read: vi.fn(), write: vi.fn() } }}
			>
				<NestedHarness />
			</ShareDrawerProvider>,
		)

		await user.click(screen.getByRole('button', { name: 'Share from actions' }))
		await waitFor(() =>
			expect(document.querySelectorAll('[data-slot="drawer-popup"]')).toHaveLength(
				2,
			),
		)
		const parent = screen
			.getByText('Connection actions')
			.closest('[role="dialog"]')
		if (!parent) throw new Error('Expected the parent actions drawer')
		expect(parent.hasAttribute('data-nested-drawer-open')).toBe(true)
	})

	it('saves QR data only through the injected file capability', async () => {
		const user = userEvent.setup()
		const save = vi.fn(async () => 'saved' as const)
		renderShare({
			clipboard: { read: vi.fn(), write: vi.fn() },
			fileSave: { save },
		})
		await user.click(screen.getByRole('button', { name: 'Open share' }))
		await user.click(await screen.findByRole('button', { name: 'Save QR code' }))

		await waitFor(() => expect(save).toHaveBeenCalledOnce())
		expect(save).toHaveBeenCalledWith({
			dataUrl: 'data:image/png;base64,qr',
			filename: expect.stringMatching(/\.png$/),
		})
		expect(toast.success).toHaveBeenCalledWith('QR code saved.')
	})

	it('reports cancellation without claiming success and reports save failures', async () => {
		const user = userEvent.setup()
		const save = vi
			.fn()
			.mockResolvedValueOnce('cancelled')
			.mockRejectedValueOnce(new Error('permission denied'))
		renderShare({
			clipboard: { read: vi.fn(), write: vi.fn() },
			fileSave: { save },
		})
		await user.click(screen.getByRole('button', { name: 'Open share' }))
		const button = await screen.findByRole('button', { name: 'Save QR code' })

		await user.click(button)
		expect(toast.success).not.toHaveBeenCalled()

		await user.click(button)
		expect(toast.error).toHaveBeenCalledWith('Could not save the QR code.')
	})

	it('renders a large raw payload once in a selectable read-only field', async () => {
		const value = `vless://${'a'.repeat(120_000)}`
		const user = userEvent.setup()
		renderShare(
			{ clipboard: { read: vi.fn(), write: vi.fn() } },
			{ ...payload, label: 'Payload', value },
		)
		await user.click(screen.getByRole('button', { name: 'Open share' }))

		const preview = await screen.findByRole('textbox', { name: 'Payload' })
		expect(preview.getAttribute('readonly')).not.toBeNull()
		expect((preview as HTMLTextAreaElement).value).toBe(value)
		expect(document.querySelectorAll('[data-slot="hyper-text"]')).toHaveLength(0)
	})

	it('announces clipboard and native-share failures', async () => {
		const user = userEvent.setup()
		const clipboard = {
			read: vi.fn(),
			write: vi.fn().mockRejectedValue(new Error('clipboard denied')),
		}
		const share = {
			share: vi.fn().mockRejectedValue(new Error('share unavailable')),
		}
		renderShare({ clipboard, share })
		await user.click(screen.getByRole('button', { name: 'Open share' }))

		await user.click(screen.getByRole('button', { name: 'Copy' }))
		expect(toast.error).toHaveBeenCalledWith('Could not copy to the clipboard.')
		await user.click(screen.getByRole('button', { name: 'Share' }))
		expect(toast.error).toHaveBeenCalledWith('System sharing is not available.')
	})

	it('treats a canceled native share sheet as neither success nor failure', async () => {
		const user = userEvent.setup()
		const cancelled = new Error('user cancelled')
		cancelled.name = 'AbortError'
		renderShare({
			clipboard: { read: vi.fn(), write: vi.fn() },
			share: { share: vi.fn().mockRejectedValue(cancelled) },
		})
		await user.click(screen.getByRole('button', { name: 'Open share' }))

		await user.click(screen.getByRole('button', { name: 'Share' }))

		expect(toast.success).not.toHaveBeenCalled()
		expect(toast.error).not.toHaveBeenCalled()
	})

	it('locks duplicate clipboard activation while the first write is pending', async () => {
		let resolveWrite: (() => void) | undefined
		const write = vi.fn(
			() =>
				new Promise<void>((resolve) => {
					resolveWrite = resolve
				}),
		)
		renderShare({ clipboard: { read: vi.fn(), write } })
		fireEvent.click(screen.getByRole('button', { name: 'Open share' }))
		const copy = await screen.findByRole('button', { name: 'Copy' })

		fireEvent.click(copy)
		fireEvent.click(copy)
		expect(write).toHaveBeenCalledOnce()
		expect(copy.hasAttribute('disabled')).toBe(true)
		resolveWrite?.()
		await waitFor(() => expect(copy.hasAttribute('disabled')).toBe(false))
	})

	it('shows QR generation failure with a retry path', async () => {
		createQrDataUrl
			.mockRejectedValueOnce(new Error('payload too large'))
			.mockResolvedValueOnce('data:image/png;base64,retried')
		const user = userEvent.setup()
		renderShare({ clipboard: { read: vi.fn(), write: vi.fn() } })
		await user.click(screen.getByRole('button', { name: 'Open share' }))

		const alert = await screen.findByRole('alert')
		expect(alert.textContent).toContain('QR code could not be generated.')
		expect(alert.textContent).not.toContain('Try QR again')
		await user.click(screen.getByRole('button', { name: 'Try QR again' }))
		expect(
			await screen.findByRole('img', { name: 'Share connection QR code' }),
		).toBeTruthy()
		expect(createQrDataUrl).toHaveBeenCalledTimes(2)
	})
})
