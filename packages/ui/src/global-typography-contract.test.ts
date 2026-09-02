/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(
	fileURLToPath(new URL('./global.css', import.meta.url)),
	'utf8',
)
const estedadCss = readFileSync(
	fileURLToPath(
		new URL('../../static/src/fonts/Estedad/estedad.css', import.meta.url),
	),
	'utf8',
)
const sonnerSource = readFileSync(
	fileURLToPath(new URL('./components/ui/sonner.tsx', import.meta.url)),
	'utf8',
)

describe('RahRow direction-aware typography contract', () => {
	it('loads the local Estedad weights used by the interface', () => {
		for (const weight of ['Regular', 'Medium', 'SemiBold', 'Bold', 'ExtraBold']) {
			expect(estedadCss).toContain(`./Estedad-${weight}.woff2`)
		}

		expect(css).not.toMatch(/Vazirmatn/i)
	})

	it('switches the shared UI font by layout direction', () => {
		expect(css).toContain('--font-ui: "Manrope Variable", sans-serif;')
		expect(css).toMatch(
			/html\[dir="rtl"\]\s*\{[\s\S]*?--font-ui: "Estedad", sans-serif;/,
		)
		expect(css).toContain('--font-sans: var(--font-ui);')
		expect(css).toContain('--font-heading: var(--font-ui);')
		expect(css).toMatch(
			/\[data-sonner-toaster\] \{\s*font-family: var\(--font-ui\);/,
		)
		expect(sonnerSource).toContain('const direction = useDirection()')
		expect(sonnerSource).toContain('dir={direction}')
	})

	it('neutralizes tracking tokens and title spacing in RTL layouts', () => {
		expect(css).toMatch(
			/html\[dir="rtl"\]\s*\{[\s\S]*?--tracking-wide: normal;[\s\S]*?--tracking-expanded-value: normal;/,
		)
		expect(css).toMatch(
			/html\[dir="rtl"\][\s\S]*?\[data-slot\$="-title"\][\s\S]*?letter-spacing: normal;/,
		)
	})
})
