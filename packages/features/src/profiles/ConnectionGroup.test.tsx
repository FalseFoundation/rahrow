import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ConnectionGroupHeader } from './ConnectionGroup.tsx'

describe('ConnectionGroupHeader', () => {
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
})
