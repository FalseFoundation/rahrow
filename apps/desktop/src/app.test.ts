import { readFileSync } from 'node:fs'
import { PRODUCT_SCREENS } from '@rahrow/features/app/product-screens.ts'
import { describe, expect, it } from 'vitest'

describe('desktop shell', () => {
	it('mounts the shared AppShell instead of a private product UI', () => {
		const source = readFileSync(new URL('./app.tsx', import.meta.url), 'utf8')

		expect(source).toContain('AppShell')
		expect(source).not.toContain('home-grid')
		expect(PRODUCT_SCREENS.map((screen) => screen.id)).toEqual([
			'home',
			'profiles',
			'subscriptions',
			'import',
			'settings',
		])
	})

	it('keeps browser zoom available in the desktop webview', () => {
		const viewport = readFileSync(
			new URL('../index.html', import.meta.url),
			'utf8',
		)

		expect(viewport).toContain('width=device-width')
		expect(viewport).toContain('<html lang="en" dir="ltr">')
		expect(viewport).not.toContain('user-scalable=no')
		expect(viewport).not.toMatch(/maximum-scale\s*=\s*1(?:\.0)?/u)
	})
})
