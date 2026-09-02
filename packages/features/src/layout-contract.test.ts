import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const featureRoot = import.meta.dirname
const cssFiles = readdirSync(featureRoot, { recursive: true })
	.filter(
		(path): path is string =>
			typeof path === 'string' && path.endsWith('.module.css'),
	)
	.map((path) => ({
		path,
		source: readFileSync(join(featureRoot, path), 'utf8'),
	}))

function css(path: string): string {
	const file = cssFiles.find((candidate) => candidate.path === path)
	if (!file) throw new Error(`Missing CSS module ${path}`)
	return file.source
}

describe('feature layout craft floor', () => {
	it('keeps functional typography at 12px or larger', () => {
		for (const file of cssFiles) {
			expect(file.source, file.path).not.toMatch(/\btext-(?:[1-9]|10|11)\b/)
			expect(file.source, file.path).not.toMatch(
				/font-size:\s*(?:0\.[0-6]\d*|0\.7[0-4])rem/,
			)
		}
	})

	it('does not switch compact product screens to desktop column layouts', () => {
		for (const path of [
			'app/screen.module.css',
			'subscriptions/Subscriptions.module.css',
		]) {
			expect(css(path), path).not.toMatch(/(?:md|lg):grid-cols/)
		}
	})

	it('uses logical inline positioning for shell and animated profile surfaces', () => {
		for (const path of [
			'app/AppShellLayout.module.css',
			'profiles/ProfileManagement.module.css',
		]) {
			expect(css(path), path).not.toMatch(
				/(?:padding|margin)-(?:left|right):|(?:^|\s)(?:left|right):|\b(?:left|right)-0\b/m,
			)
		}
	})

	it('wraps volatile errors, endpoints, URLs, and log messages', () => {
		for (const path of [
			'home/Home.module.css',
			'profiles/ConnectionProfileList.module.css',
			'subscriptions/Subscriptions.module.css',
			'diagnostics/Diagnostics.module.css',
			'logs/Logs.module.css',
			'settings/Settings.module.css',
			'share/ShareDrawer.module.css',
		]) {
			expect(css(path), path).toContain('overflow-wrap: anywhere')
		}
	})

	it('keeps shell and static navigation inside all safe-area insets', () => {
		const shell = css('app/AppShellLayout.module.css')
		for (const inset of ['top', 'bottom', 'left', 'right']) {
			expect(shell).toContain(`safe-area-inset-${inset}`)
		}
		expect(shell).toContain('padding-inline-start')
		expect(shell).toContain('padding-inline-end')
		expect(shell).toContain('margin-inline-start')
	})

	it('provides reduced-motion behavior wherever feature CSS animates', () => {
		expect(css('profiles/ProfileManagement.module.css')).toContain(
			'@media (prefers-reduced-motion: reduce)',
		)
	})

	it('uses the shared compact page and section hierarchy', () => {
		for (const path of [
			'home/Home.module.css',
			'profiles/Profiles.module.css',
			'import/Import.module.css',
			'subscriptions/Subscriptions.module.css',
			'settings/Settings.module.css',
			'logs/Logs.module.css',
		]) {
			expect(css(path), path).toMatch(/\.page\s*{[^}]*min-w-0/s)
		}
		for (const path of [
			'diagnostics/Diagnostics.module.css',
			'logs/Logs.module.css',
		]) {
			expect(css(path), path).toMatch(/\.sectionHeading h2\s*{[^}]*text-xl/s)
		}
	})

	it('keeps content-sized drawer bodies intrinsically measurable', () => {
		for (const path of [
			'import/ConnectionImportDrawer.module.css',
			'profiles/ConnectionActionDrawers.module.css',
			'profiles/ConnectionProfileEditor.module.css',
			'profiles/ProfileManagement.module.css',
			'profiles/SubscriptionEditor.module.css',
			'settings/Settings.module.css',
			'share/ShareDrawer.module.css',
		]) {
			expect(css(path), path).not.toContain('h-0 min-h-0 flex-1')
			expect(css(path), path).not.toContain('min-h-0 flex-1 flex-col')
		}
	})

	it('keeps drawer tabs content-sized instead of stretching across the drawer', () => {
		for (const path of [
			'diagnostics/Diagnostics.module.css',
			'import/ConnectionImportDrawer.module.css',
			'profiles/ConnectionProfileEditor.module.css',
		]) {
			expect(css(path), path).toContain('w-fit')
			expect(css(path), path).toContain('flex-none')
		}
	})
})
