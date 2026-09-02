import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SubscriptionMetadataSummary } from './SubscriptionMetadataSummary.tsx'

describe('SubscriptionMetadataSummary', () => {
	it('renders supplied quota, expiry, and validated provider links', () => {
		render(
			<SubscriptionMetadataSummary
				metadata={{
					usage: {
						downloadBytes: 512 * 1024 ** 2,
						totalBytes: 1024 ** 3,
						expiresAt: '2026-09-13T19:26:51.000Z',
					},
					profileUrl: 'https://provider.example/account',
					supportUrl: 'https://support.example/help',
				}}
			/>,
		)

		expect(
			screen
				.getByRole('progressbar', { name: 'Data used' })
				.getAttribute('aria-valuenow'),
		).toBe('50')
		expect(screen.getByText(/MB of .*GB used$/u)).toBeTruthy()
		expect(
			screen
				.getByText(/Expires/u)
				.querySelector('time')
				?.getAttribute('datetime'),
		).toBe('2026-09-13T19:26:51.000Z')
		expect(
			screen.getByRole('link', { name: 'Provider' }).getAttribute('href'),
		).toBe('https://provider.example/account')
		expect(
			screen.getByRole('link', { name: 'Support' }).getAttribute('rel'),
		).toBe('noreferrer')
	})

	it('renders nothing when metadata is absent', () => {
		const { container } = render(<SubscriptionMetadataSummary />)
		expect(container.childElementCount).toBe(0)
	})
})
