import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Connections neutral selection styling', () => {
	it('uses a non-color-only neutral marker with high-contrast and reduced-motion fallbacks', () => {
		const css = readFileSync(
			resolve(import.meta.dirname, 'ConnectionProfileList.module.css'),
			'utf8',
		)
		const selected = css.slice(css.indexOf('.profileRow[data-selected="true"]'))

		expect(selected).toContain('bg-muted')
		expect(selected).toContain('font-semibold')
		expect(selected).toContain('forced-colors: active')
		expect(selected).toContain('prefers-reduced-motion: reduce')
		expect(selected).not.toMatch(/primary|connection-primary|blue/i)
	})
})
