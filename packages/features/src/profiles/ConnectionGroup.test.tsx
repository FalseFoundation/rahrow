import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ConnectionGroupHeader } from './ConnectionGroup.tsx'

describe('ConnectionGroupHeader', () => {
	afterEach(cleanup)

	it('replaces the leading group icon with progress while refreshing', () => {
		const markup = renderToStaticMarkup(
			<ConnectionGroupHeader
				open
				onOpenChange={() => undefined}
				title='Work'
				detail='12 profiles'
				refreshing
				onActions={() => undefined}
			/>,
		)

		expect(markup).toContain('aria-label="Refreshing Work"')
		expect(markup).not.toContain('data-icon="wifi"')
		expect(markup.indexOf('Refreshing Work')).toBeLessThan(markup.indexOf('<h2'))
	})

	it('uses concise localized labels without repeating the group name', () => {
		const markup = renderToStaticMarkup(
			<ConnectionGroupHeader
				open
				onOpenChange={() => undefined}
				title='Private source'
				detail='12 profiles'
				onActions={() => undefined}
			/>,
		)

		expect(markup).toContain('aria-label="More actions"')
		expect(markup).toContain('title="More actions"')
		expect(markup).toContain('aria-label="Collapse group"')
		expect(markup).not.toContain('aria-label="Private source"')
	})

	it('shows lock state without replacing subscription identity', () => {
		const markup = renderToStaticMarkup(
			<ConnectionGroupHeader
				open
				locked
				kind='subscription'
				onOpenChange={() => undefined}
				title='Private source'
				detail='12 profiles'
				onActions={() => undefined}
			/>,
		)

		expect(markup).toContain('Locked')
		expect(markup).toContain('data-slot="item-media"')
		expect(markup).toContain('<h2 title="Private source">Private source</h2>')
	})

	it('opens group actions from a secondary click', async () => {
		const onActions = vi.fn()
		render(
			<ConnectionGroupHeader
				open
				onOpenChange={() => undefined}
				title='Private source'
				detail='12 profiles'
				onActions={onActions}
			/>,
		)

		fireEvent.contextMenu(screen.getByRole('heading', { name: 'Private source' }))
		fireEvent.click(await screen.findByRole('menuitem', { name: 'More actions' }))
		expect(onActions).toHaveBeenCalledOnce()
	})
})
