import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

const css = read('./ConnectionImportDrawer.module.css')

describe('ConnectionImportDrawer layout contract', () => {
	it('constrains each tab panel to one visible drawer scroll viewport', () => {
		expect(css).toMatch(
			/\.root\s*\{[\s\S]*?flex min-h-0 flex-auto flex-col overflow-hidden;/,
		)
		expect(css).toMatch(
			/\.panel\s*\{[\s\S]*?flex min-h-0 flex-auto flex-col overflow-hidden/,
		)
		expect(css).toMatch(
			/\.panelScroll\s*\{[\s\S]*?min-h-0 flex-1 scrollbar-thin scrollbar-gutter-stable/,
		)
	})
})

function read(relativePath: string) {
	return readFileSync(new URL(relativePath, import.meta.url), 'utf8')
}
