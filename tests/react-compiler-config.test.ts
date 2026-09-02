import { readFileSync } from 'node:fs'
import { createReactViteConfig } from '@rahrow/tooling/react.ts'
import type { PluginOption } from 'vite'
import { describe, expect, it } from 'vitest'

describe('shared React compiler build config', () => {
	it('owns the React and compiler transforms in shared tooling', () => {
		const config = createReactViteConfig()
		const pluginNames = flattenPlugins(config.plugins ?? []).map(
			(plugin) => plugin.name,
		)

		expect(pluginNames.some((name) => name.includes('react'))).toBe(true)
		expect(pluginNames.some((name) => name.includes('babel'))).toBe(true)
	})

	it.each(['desktop', 'mobile'] as const)(
		'%s consumes the shared React build without app-specific compiler setup',
		(app) => {
			const source = readFileSync(
				new URL(`../apps/${app}/vite.config.ts`, import.meta.url),
				'utf8',
			)

			expect(source).toContain('createReactViteConfig')
			expect(source).not.toContain("from '@vitejs/plugin-react'")
			expect(source).not.toContain('babel-plugin-react-compiler')
		},
	)
})

function flattenPlugins(options: readonly PluginOption[]) {
	return options.flatMap((option) => {
		if (!option) return []
		if (Array.isArray(option)) return flattenPlugins(option)
		if (option instanceof Promise) return []
		return [option]
	})
}
