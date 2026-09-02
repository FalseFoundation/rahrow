import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppHeaderSlot } from './AppHeaderSlot.tsx'
import { RouteErrorFallback, RouteLoadingFallback } from './router.tsx'

afterEach(cleanup)

describe('route resilience', () => {
	it('announces lazy route loading without hiding the app navigation', () => {
		render(
			<AppHeaderSlot>
				<div data-app-scroll-body>
					<RouteLoadingFallback />
				</div>
			</AppHeaderSlot>,
		)

		const status = screen.getByRole('status')
		const headerSlot = document.querySelector('[data-app-header-slot]')
		expect(status.textContent).toContain('Loading screen')
		expect(status.getAttribute('aria-atomic')).toBe('true')
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
		expect(headerSlot?.contains(screen.getByRole('heading', { level: 1 }))).toBe(
			true,
		)
	})

	it('offers both immediate retry and a diagnostics escape hatch', async () => {
		const user = userEvent.setup()
		const reload = vi.fn()

		render(<RouteErrorFallback onReload={reload} />)

		const alert = screen.getByRole('alert')
		expect(alert.textContent).toContain('This screen could not be loaded')
		expect(alert.textContent).not.toContain('Reload app')
		expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
		expect(
			screen.getByRole('link', { name: 'Open diagnostics' }).getAttribute('href'),
		).toBe('#/settings?drawer=diagnostics')
		await user.click(screen.getByRole('button', { name: 'Reload app' }))
		expect(reload).toHaveBeenCalledOnce()
	})
})
