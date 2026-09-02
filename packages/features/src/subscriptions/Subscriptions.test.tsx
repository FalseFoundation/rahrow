import type { Subscription } from '@rahrow/core/subscription/subscription-import.ts'
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const useSubscriptions = vi.hoisted(() => vi.fn())

vi.mock('./useSubscriptions.ts', () => ({ useSubscriptions }))

import { Subscriptions } from './Subscriptions.tsx'

const subscription: Subscription = {
	id: 'example-com-main',
	url: 'https://example.com/main.txt',
	name: 'Example',
}

function renderScreen(overrides: Record<string, unknown> = {}) {
	const actions = {
		setUrl: vi.fn(),
		setName: vi.fn(),
		add: vi.fn(async () => undefined),
		confirmReplace: vi.fn(async () => undefined),
		cancelReplace: vi.fn(),
		refresh: vi.fn(async () => undefined),
		requestRemove: vi.fn(async () => undefined),
		confirmRemove: vi.fn(async () => undefined),
		cancelRemove: vi.fn(),
		retryInitialLoad: vi.fn(async () => undefined),
	}
	useSubscriptions.mockReturnValue({
		state: {
			subscriptions: [subscription],
			url: 'https://example.com/new.txt',
			name: 'New source',
			message: 'Ready',
			failure: null,
			duplicate: null,
			removalCandidate: null,
			isLoading: false,
			isInitialized: true,
			initializationFailure: null,
			addPending: false,
			refreshingIds: new Set<string>(),
			removingIds: new Set<string>(),
			...overrides,
		},
		actions,
	})
	render(<Subscriptions />)
	return actions
}

describe('Subscriptions', () => {
	beforeEach(() => useSubscriptions.mockReset())
	afterEach(cleanup)

	it('shows a retryable load failure instead of an empty state and disables adding', async () => {
		const actions = renderScreen({
			subscriptions: [],
			isInitialized: false,
			initializationFailure: {
				title: "Couldn't load subscriptions",
				description: 'RahRow could not read your saved subscription sources.',
				detail: 'Your sources were not changed. Try again or open Diagnostics.',
			},
		})
		const user = userEvent.setup()

		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
		expect(
			screen.getByRole('heading', { level: 2, name: 'Add source' }),
		).toBeTruthy()
		expect(
			screen.getByRole('heading', { level: 2, name: 'Remote sources' }),
		).toBeTruthy()
		expect(
			screen.getByRole('heading', {
				level: 3,
				name: "Couldn't load subscriptions",
			}),
		).toBeTruthy()
		expect(screen.getByRole('alert').textContent).toContain(
			"Couldn't load subscriptions",
		)
		expect(screen.queryByText('No subscriptions')).toBeNull()
		expect(
			(
				screen.getByRole('button', {
					name: 'Add subscription',
				}) as HTMLButtonElement
			).disabled,
		).toBe(true)

		await user.click(screen.getByRole('button', { name: 'Retry' }))
		expect(actions.retryInitialLoad).toHaveBeenCalledOnce()
	})

	it('submits a persistently labelled URL form without asking for an identifier', async () => {
		const actions = renderScreen()
		const form = screen.getByRole('form', { name: 'Add subscription source' })

		expect(screen.getByRole('textbox', { name: 'Subscription URL' })).toBeTruthy()
		expect(screen.getByRole('textbox', { name: 'Display name' })).toBeTruthy()
		expect(screen.queryByRole('textbox', { name: 'Identifier' })).toBeNull()
		fireEvent.submit(form)
		await waitFor(() => expect(actions.add).toHaveBeenCalledOnce())
	})

	it('rejects an insecure subscription URL before invoking the action', async () => {
		const actions = renderScreen({ url: 'http://example.com/sub.txt' })
		const user = userEvent.setup()

		await user.click(screen.getByRole('button', { name: 'Add subscription' }))

		expect(actions.add).not.toHaveBeenCalled()
		expect(
			screen
				.getByRole('textbox', { name: 'Subscription URL' })
				.getAttribute('aria-invalid'),
		).toBe('true')
		expect(screen.getByText('Subscription URLs must use HTTPS')).toBeTruthy()
	})

	it('keeps entered fields visible and associates a visible failure alert', () => {
		renderScreen({
			failure: {
				operation: 'add',
				message: 'Could not save this source. Check the URL and try again.',
			},
		})

		expect(screen.getByDisplayValue('https://example.com/new.txt')).toBeTruthy()
		expect(screen.getByDisplayValue('New source')).toBeTruthy()
		const alert = screen.getByRole('alert')
		expect(alert.textContent).toContain('Could not save this source')
		expect(
			screen
				.getByRole('textbox', { name: 'Subscription URL' })
				.getAttribute('aria-describedby'),
		).toBe(alert.id)
	})

	it('requires explicit confirmation before replacing a duplicate source', async () => {
		const actions = renderScreen({ duplicate: subscription })
		const user = userEvent.setup()

		expect(screen.getByRole('alertdialog')).toBeTruthy()
		expect(screen.getByText(/already exists/i)).toBeTruthy()
		await user.click(screen.getByRole('button', { name: 'Replace source' }))
		expect(actions.confirmReplace).toHaveBeenCalledOnce()
	})

	it('explains owned-profile consequences before confirmed removal', async () => {
		const actions = renderScreen({
			removalCandidate: { subscription, ownedProfileCount: 3 },
		})
		const user = userEvent.setup()

		expect(screen.getByText(/also remove 3 connection profiles/i)).toBeTruthy()
		await user.click(
			screen.getByRole('button', { name: 'Remove source and profiles' }),
		)
		expect(actions.confirmRemove).toHaveBeenCalledOnce()
	})

	it('locks refresh and remove controls while that item is changing', () => {
		renderScreen({ refreshingIds: new Set([subscription.id]) })

		expect(
			(
				screen.getByRole('button', { name: 'Refresh Example' }) as HTMLButtonElement
			).disabled,
		).toBe(true)
		expect(
			(screen.getByRole('button', { name: 'Remove Example' }) as HTMLButtonElement)
				.disabled,
		).toBe(true)
	})
})
