import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ConnectionActionsDrawer } from './ConnectionActionDrawers.tsx'

const commonProps = {
	actions: {} as never,
	onRefreshSubscription: vi.fn(),
	onExport: vi.fn(),
	onSpeedTest: vi.fn(),
	onDelete: vi.fn(),
	onEdit: vi.fn(),
	onClose: vi.fn(),
}

afterEach(cleanup)

describe('ConnectionActionsDrawer cleanup entry points', () => {
	it.each([
		{
			name: 'subscription',
			target: {
				kind: 'subscription' as const,
				subscription: { id: 'source', url: 'https://example.com' },
				profiles: [],
			},
		},
		{
			name: 'standalone group',
			target: { kind: 'local' as const, profiles: [] },
		},
	])('opens scoped cleanup from the $name menu', async ({ target }) => {
		const onCleanup = vi.fn()
		const user = userEvent.setup()
		render(
			<ConnectionActionsDrawer
				{...commonProps}
				target={target}
				onCleanup={onCleanup}
			/>,
		)

		await user.click(screen.getByRole('button', { name: 'Clean up connections' }))
		expect(onCleanup).toHaveBeenCalledOnce()
	})
})
