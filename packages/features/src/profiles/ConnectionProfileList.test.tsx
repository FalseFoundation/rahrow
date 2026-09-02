import type { ConnectionProfile } from '@rahrow/core/profile/connection-profile.ts'
import { cleanup, render, screen, within } from '@testing-library/react'
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
		expect(actions.getAttribute('title')).toBe('More actions')
		await user.click(actions)
		expect(onActions).toHaveBeenCalledWith(standalone)
		expect(onActivate).toHaveBeenCalledTimes(1)
	})
})
