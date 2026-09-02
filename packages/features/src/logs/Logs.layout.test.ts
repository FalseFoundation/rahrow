import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Logs responsive layout', () => {
	it('keeps narrow and RTL log records fluid without hiding actionable detail', () => {
		const stylesheet = readFileSync(
			resolve(import.meta.dirname, 'Logs.module.css'),
			'utf8',
		)
		const component = readFileSync(
			resolve(import.meta.dirname, 'Logs.tsx'),
			'utf8',
		)

		expect(stylesheet).not.toContain('min-width: 44rem')
		expect(stylesheet).not.toContain('height: min(32rem, 60vh)')
		expect(stylesheet).not.toContain('text-overflow: ellipsis')
		expect(stylesheet).not.toContain('white-space: nowrap')
		expect(stylesheet).not.toMatch(/\bleft:\s*0/)
		expect(stylesheet).toContain('overflow-wrap: anywhere')
		expect(stylesheet).toContain('grid-template-areas')
		expect(component).toContain('useAppScrollViewport')
		expect(component).not.toContain('<ScrollArea')
	})
})
