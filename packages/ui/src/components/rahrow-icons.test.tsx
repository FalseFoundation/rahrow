import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import {
	AddIcon,
	BackIcon,
	ChevronIcon,
	DuplicateIcon,
	ShareIcon,
} from './rahrow-icons.tsx'

describe('RahRow icon semantics', () => {
	it.each([
		['add', AddIcon],
		['back', BackIcon],
		['duplicate', DuplicateIcon],
		['share', ShareIcon],
	] as const)('keeps the %s glyph decorative by default', (_name, Icon) => {
		const markup = renderToStaticMarkup(<Icon />)

		expect(markup).toContain('aria-hidden="true"')
		expect(markup).toContain('focusable="false"')
	})

	it('keeps chevrons sized and direction-aware', () => {
		const markup = renderToStaticMarkup(<ChevronIcon />)

		expect(markup).toContain('rtl:rotate-180')
		expect(markup).toContain('size-4')
	})

	it('mirrors the back affordance in RTL layouts', () => {
		const markup = renderToStaticMarkup(<BackIcon />)

		expect(markup).toContain('rtl:rotate-180')
	})
})
