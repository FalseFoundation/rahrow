import {
	Drawer,
	DrawerClose,
	DrawerContent,
	DrawerTitle,
} from '@rahrow/ui/components/ui/drawer.tsx'
import { IconAction } from '@rahrow/ui/components/ui/icon-action.tsx'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

describe('icon action interaction contract', () => {
	it('shows its label on keyboard focus and still activates normally', async () => {
		const user = userEvent.setup()
		const onClick = vi.fn()
		render(
			<IconAction label='Refresh connections' onClick={onClick}>
				<svg aria-hidden='true' />
			</IconAction>,
		)

		await user.tab()
		expect(document.activeElement).toBe(
			screen.getByRole('button', { name: 'Refresh connections' }),
		)
		expect((await screen.findByRole('tooltip')).textContent).toContain(
			'Refresh connections',
		)

		await user.keyboard('{Enter}')
		expect(onClick).toHaveBeenCalledOnce()
	})

	it('does not require a tooltip before a touch action can activate', async () => {
		const user = userEvent.setup()
		const onClick = vi.fn()
		render(
			<IconAction label='Open actions' onClick={onClick}>
				<svg aria-hidden='true' />
			</IconAction>,
		)

		const action = screen.getByRole('button', { name: 'Open actions' })
		expect(screen.queryByRole('tooltip')).toBeNull()
		await user.pointer([
			{ keys: '[TouchA]', target: action },
			{ keys: '[/TouchA]' },
		])
		expect(onClick).toHaveBeenCalledOnce()
	})

	it('composes with a drawer close primitive as one semantic button', async () => {
		const user = userEvent.setup()
		render(
			<Drawer defaultOpen>
				<DrawerContent>
					<DrawerTitle>Connection actions</DrawerTitle>
					<IconAction label='Close actions' render={<DrawerClose />}>
						<svg aria-hidden='true' />
					</IconAction>
				</DrawerContent>
			</Drawer>,
		)

		const close = screen.getByRole('button', { name: 'Close actions' })
		expect(close.querySelector('button')).toBeNull()
		expect(screen.getAllByRole('button', { name: 'Close actions' })).toHaveLength(
			1,
		)

		await user.click(close)
		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	})
})
