import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConnectionProfileList } from './ConnectionProfileList.tsx'

const standalone: ConnectionProfile = {
	id: 'standalone',
	protocol: 'vmess',
	endpoint: { host: 'standalone.example', port: 443 },
	metadata: { name: 'Standalone', source: 'manual' },
}
const subscribed: ConnectionProfile = {
	id: 'subscribed',
	protocol: 'shadowsocks',
	endpoint: { host: 'subscribed.example', port: 8443 },
	metadata: {
		name: 'Subscribed',
		source: 'subscription',
		subscriptionId: 'source',
	},
}

describe('ConnectionProfileList selection', () => {
	afterEach(cleanup)

	it('uses the compact SS protocol badge for Shadowsocks profiles', () => {
		render(
			<ConnectionProfileList
				profiles={[subscribed]}
				selectedId=''
				onActivate={vi.fn().mockResolvedValue(undefined)}
				onActions={vi.fn()}
				speedTests={{}}
			/>,
		)

		expect(screen.getByText('SS')).toBeTruthy()
		expect(screen.queryByText('SHADOWSOCKS')).toBeNull()
	})

	it('keeps displayed connection endpoints outside selectable content', () => {
		render(
			<ConnectionProfileList
				profiles={[standalone]}
				selectedId=''
				onActivate={vi.fn().mockResolvedValue(undefined)}
				onActions={vi.fn()}
				speedTests={{}}
			/>,
		)

		const endpoint = screen.getByText('standalone.example:443')
		expect(endpoint.hasAttribute('data-selectable')).toBe(false)
	})

	it('keeps inherited lock state visible beside the profile identity', () => {
		render(
			<ConnectionProfileList
				profiles={[subscribed]}
				selectedId=''
				isLocked={() => true}
				onActivate={vi.fn().mockResolvedValue(undefined)}
				onActions={vi.fn()}
				speedTests={{}}
			/>,
		)

		expect(screen.getByText('Locked')).toBeTruthy()
		expect(screen.getByText('Subscribed')).toBeTruthy()
		expect(screen.getByText('SS')).toBeTruthy()
	})

	it('moves the neutral programmatic current state across standalone and subscription rows', () => {
		const props = {
			listKey: 'selection',
			profiles: [standalone, subscribed],
			selectedId: subscribed.id,
			onActivate: vi.fn().mockResolvedValue(undefined),
			onActions: vi.fn(),
			speedTests: {},
		}
		const rendered = render(<ConnectionProfileList {...props} />)

		const subscribedRow = screen
			.getByText('Subscribed')
			.closest('[data-slot="item"]')
		if (!(subscribedRow instanceof HTMLElement)) {
			throw new Error('Expected the subscribed connection row')
		}
		const selectedUse = within(subscribedRow).getByRole('button', {
			name: 'Use connection',
		})
		const selectedRow = selectedUse.closest('[data-slot="item"]')
		expect(selectedRow?.getAttribute('data-selected')).toBe('true')
		expect(selectedRow?.getAttribute('aria-current')).toBeNull()
		expect(selectedUse.getAttribute('aria-current')).toBe('true')
		expect(
			screen
				.getByRole('button', { name: /Subscribed.*subscribed\.example/ })
				.getAttribute('aria-current'),
		).toBe('true')
		expect(
			within(subscribedRow)
				.getByRole('button', { name: 'More actions' })
				.getAttribute('aria-current'),
		).toBeNull()

		rendered.rerender(
			<ConnectionProfileList {...props} selectedId={standalone.id} />,
		)
		const standaloneRow = screen
			.getByText('Standalone')
			.closest('[data-slot="item"]')
		if (!(standaloneRow instanceof HTMLElement)) {
			throw new Error('Expected the standalone connection row')
		}
		expect(
			within(standaloneRow)
				.getByRole('button', { name: 'Use connection' })
				.getAttribute('aria-current'),
		).toBe('true')
		expect(selectedUse.getAttribute('aria-current')).toBeNull()
	})

	it('activates from the keyboard while the overflow action remains independent', async () => {
		const user = userEvent.setup()
		const onActivate = vi.fn().mockResolvedValue(undefined)
		const onActions = vi.fn()
		render(
			<ConnectionProfileList
				listKey='keyboard'
				profiles={[standalone]}
				selectedId=''
				onActivate={onActivate}
				onActions={onActions}
				speedTests={{}}
			/>,
		)

		await user.tab()
		expect(document.activeElement).toBe(
			screen.getByRole('button', { name: /Standalone.*standalone\.example/ }),
		)
		await user.keyboard('{Enter}')
		expect(onActivate).toHaveBeenCalledWith(standalone)

		const row = screen.getByText('Standalone').closest('[data-slot="item"]')
		if (!(row instanceof HTMLElement)) {
			throw new Error('Expected the standalone connection row')
		}
		const actions = within(row).getByRole('button', { name: 'More actions' })
		await user.click(actions)
		expect(onActions).toHaveBeenCalledWith(standalone)
		expect(onActivate).toHaveBeenCalledTimes(1)
	})

	it('opens the same actions from a secondary click without activating the profile', async () => {
		const user = userEvent.setup()
		const onActivate = vi.fn().mockResolvedValue(undefined)
		const onActions = vi.fn()
		render(
			<ConnectionProfileList
				profiles={[standalone]}
				selectedId=''
				onActivate={onActivate}
				onActions={onActions}
				speedTests={{}}
			/>,
		)

		const row = screen.getByText('Standalone').closest('[data-slot="item"]')
		if (!(row instanceof HTMLElement)) {
			throw new Error('Expected the standalone connection row')
		}
		fireEvent.contextMenu(row)
		await user.click(
			await screen.findByRole('menuitem', { name: 'More actions' }),
		)

		expect(onActions).toHaveBeenCalledWith(standalone)
		expect(onActivate).not.toHaveBeenCalled()
	})

	it('opens actions after the Base UI touch hold and cancels when touch moves', () => {
		vi.useFakeTimers()
		try {
			const onActivate = vi.fn().mockResolvedValue(undefined)
			const onActions = vi.fn()
			render(
				<ConnectionProfileList
					profiles={[standalone]}
					selectedId=''
					onActivate={onActivate}
					onActions={onActions}
					speedTests={{}}
				/>,
			)

			const row = screen.getByText('Standalone').closest('[data-slot="item"]')
			if (!(row instanceof HTMLElement)) {
				throw new Error('Expected the standalone connection row')
			}
			const surface = row.closest('[data-slot="context-menu-trigger"]')
			if (!(surface instanceof HTMLElement)) {
				throw new Error('Expected the profile context-menu surface')
			}

			fireEvent.touchStart(surface, {
				touches: [{ clientX: 20, clientY: 20, identifier: 1 }],
			})
			fireEvent.touchMove(surface, {
				touches: [{ clientX: 31, clientY: 20, identifier: 1 }],
			})
			act(() => vi.advanceTimersByTime(500))
			expect(screen.queryByRole('menuitem')).toBeNull()

			fireEvent.touchStart(surface, {
				touches: [{ clientX: 20, clientY: 20, identifier: 1 }],
			})
			act(() => vi.advanceTimersByTime(500))
			const item = screen.getByRole('menuitem', { name: 'More actions' })
			fireEvent.click(item)

			expect(onActions).toHaveBeenCalledWith(standalone)
			expect(onActivate).not.toHaveBeenCalled()
		} finally {
			vi.useRealTimers()
		}
	})
})
