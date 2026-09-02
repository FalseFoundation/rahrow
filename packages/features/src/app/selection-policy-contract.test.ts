/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

function source(relativePath: string) {
	return readFileSync(
		fileURLToPath(new URL(relativePath, import.meta.url)),
		'utf8',
	)
}

describe('product text-selection contract', () => {
	it('keeps app chrome inert while preserving native and explicit copy surfaces', () => {
		const globalCss = source('../../../ui/src/global.css')

		expect(source('./AppShellLayout.tsx')).toContain('data-app-shell')
		expect(source('../../../ui/src/components/ui/drawer.tsx')).toContain(
			'data-app-shell',
		)
		expect(globalCss).toMatch(/\[data-app-shell\]\s*\{[^}]*user-select:\s*none;/s)

		for (const selector of [
			'input',
			'textarea',
			'[contenteditable]:not([contenteditable="false"])',
			'code',
			'pre',
			'[data-selectable]',
		]) {
			expect(globalCss).toContain(selector)
		}
		expect(globalCss).toMatch(/user-select:\s*text;/)
	})

	it('marks shared fields and operational values as selectable', () => {
		const input = source('../../../ui/src/components/ui/input.tsx')
		const textarea = source('../../../ui/src/components/ui/textarea.tsx')

		expect(input).toContain('select-text')
		expect(input).not.toContain('disabled:pointer-events-none')
		expect(textarea).toContain('select-text')

		for (const relativePath of [
			'../logs/Logs.tsx',
			'../share/ShareDrawer.tsx',
			'../home/Home.tsx',
		]) {
			expect(source(relativePath), relativePath).toContain('data-selectable')
		}
	})

	it('does not expose profile endpoints and keeps observed egress selectable', () => {
		expect(source('../profiles/ConnectionProfileList.tsx')).not.toContain(
			'data-selectable',
		)
		expect(source('../home/Home.tsx')).not.toContain('selected.endpoint')
		expect(source('../home/Home.tsx')).toContain(
			'state.egressIdentity.observation.ip',
		)
	})
})
