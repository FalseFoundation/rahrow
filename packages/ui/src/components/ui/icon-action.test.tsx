import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { IconAction } from './icon-action.tsx'

describe('IconAction', () => {
	it('owns a durable accessible name while preserving button semantics', () => {
		const markup = renderToStaticMarkup(
			<IconAction label='Refresh connections' size='icon-sm'>
				<svg aria-hidden='true' />
			</IconAction>,
		)

		expect(markup).toContain('<button')
		expect(markup).toContain('aria-label="Refresh connections"')
		expect(markup).toContain('title="Refresh connections"')
		expect(markup).toContain('data-slot="tooltip-trigger"')
		expect(markup).toContain('[@media(pointer:coarse)]:min-h-11')
	})

	it('preserves disabled action semantics', () => {
		const markup = renderToStaticMarkup(
			<IconAction disabled label='Refresh connections' size='icon-sm'>
				<svg aria-hidden='true' />
			</IconAction>,
		)

		expect(markup).toContain('disabled=""')
		expect(markup).toContain('aria-label="Refresh connections"')
	})
})
