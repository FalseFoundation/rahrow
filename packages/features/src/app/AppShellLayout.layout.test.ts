import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const stylesheet = readFileSync(
	join(dirname(fileURLToPath(import.meta.url)), 'AppShellLayout.module.css'),
	'utf8',
)

describe('AppShellLayout scroll ownership', () => {
	it('keeps the shell viewport bounded with one stretched scroll region', () => {
		expect(stylesheet).toMatch(
			/\.shell\s*\{[\s\S]*?flex h-svh min-h-0[^;]*flex-col overflow-hidden/,
		)
		expect(stylesheet).toMatch(/\.appScroll\s*\{[\s\S]*?min-h-0 flex-1/)
		expect(stylesheet).not.toContain('min-h-[40rem]')
	})

	it('reserves a static safe-area-aware header row outside the scroll region', () => {
		const headerRule = stylesheet.match(/\.headerSlot\s*\{([\s\S]*?)\}/)?.[1]

		expect(headerRule).toBeDefined()
		expect(headerRule).toContain('shrink-0')
		expect(headerRule).toContain('--safe-area-inset-top')
		expect(headerRule).not.toContain('sticky')
	})

	it('keeps navigation in normal flow and needs no content overlay spacer', () => {
		const navigationRule = stylesheet.match(/\.nav\s*\{([\s\S]*?)\}/)?.[1]

		expect(navigationRule).toBeDefined()
		expect(navigationRule).not.toContain('fixed')
		expect(navigationRule).toContain('shrink-0')
		expect(stylesheet).not.toContain('pb-[calc(var(--spacing)*25')
	})
})
