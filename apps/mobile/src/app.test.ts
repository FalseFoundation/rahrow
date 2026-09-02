import { readFileSync } from 'node:fs'
import { PRODUCT_SCREENS } from '@rahrow/features/app/product-screens.ts'
import { describe, expect, it } from 'vitest'

describe('mobile shell', () => {
	it('mounts the same shared AppShell as desktop', () => {
		const source = readFileSync(new URL('./app.tsx', import.meta.url), 'utf8')

		expect(source).toContain('AppShell')
		expect(source).not.toContain('home-grid')
		expect(source).not.toContain('useMobileHome')
		expect(source).not.toContain('ProfileManagement')
		expect(PRODUCT_SCREENS.map((screen) => screen.id)).toEqual([
			'home',
			'profiles',
			'subscriptions',
			'import',
			'settings',
		])
	})

	it('keeps shared content inside the mobile viewport safe area', () => {
		const viewport = readFileSync(
			new URL('../index.html', import.meta.url),
			'utf8',
		)
		const shellStyles = readFileSync(
			new URL(
				'../../../packages/features/src/app/AppShellLayout.module.css',
				import.meta.url,
			),
			'utf8',
		)

		expect(viewport).toContain('viewport-fit=cover')
		expect(viewport).toContain('<html lang="en" dir="ltr">')
		expect(viewport).not.toContain('user-scalable=no')
		expect(viewport).not.toMatch(/maximum-scale\s*=\s*1(?:\.0)?/u)
		expect(shellStyles).toContain('env(safe-area-inset-top)')
		expect(shellStyles).toContain('env(safe-area-inset-left)')
		expect(shellStyles).toContain('env(safe-area-inset-right)')
		expect(shellStyles).toContain('env(safe-area-inset-bottom)')
		expect(shellStyles).toContain('[dir="rtl"] .shell')
		expect(shellStyles).toContain('padding-inline-start')
		expect(shellStyles).toContain('padding-inline-end')
		expect(shellStyles).toContain('var(--safe-inline-start)')
		expect(shellStyles).not.toMatch(/padding-(?:left|right)\s*:/u)
	})
})
