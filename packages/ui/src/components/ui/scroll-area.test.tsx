import { readFileSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { ScrollArea } from './scroll-area.tsx'

const scrollAreaSource = readFileSync(
	new URL('./scroll-area.tsx', import.meta.url),
	'utf8',
)

describe('ScrollArea', () => {
	it.each([
		['vertical', 'touch-pan-y', 'scroll-fade-b'],
		['horizontal', 'touch-pan-x', 'scroll-fade-x'],
		['both', 'touch-auto', 'scroll-fade'],
	] as const)(
		'uses %s scrolling interaction and edge treatment',
		(scrollbars, touchClass, fadeClass) => {
			const markup = renderToStaticMarkup(
				<ScrollArea scrollbars={scrollbars}>Content</ScrollArea>,
			)

			expect(markup).toContain(touchClass)
			expect(markup).toContain(fadeClass)
		},
	)

	it('reveals its scrollbar for hover, keyboard focus, and active scrolling', () => {
		expect(scrollAreaSource).toContain('opacity-0')
		expect(scrollAreaSource).toContain('group-hover/scroll-area:opacity-100')
		expect(scrollAreaSource).toContain(
			'group-focus-within/scroll-area:opacity-100',
		)
		expect(scrollAreaSource).toContain(
			'group-data-[scrolling]/scroll-area:opacity-100',
		)
	})
})
