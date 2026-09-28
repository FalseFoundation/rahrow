/// <reference types="node" />

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

const css = readFileSync(
	fileURLToPath(new URL('./global.css', import.meta.url)),
	'utf8',
)

const colorProperty =
	/^--(?:background|foreground|card(?:-foreground)?|popover(?:-foreground)?|primary(?:-foreground)?|secondary(?:-foreground)?|muted(?:-foreground)?|accent(?:-foreground)?|destructive|border|input|ring|chart-[1-5]|sidebar(?:-(?:foreground|primary|primary-foreground|accent|accent-foreground|border|ring))?|connection-primary(?:-foreground)?|success(?:-foreground)?|warning(?:-foreground)?|surface(?:-(?:foreground|floating|static))?|ambient|dim|glass|color-.+|shadow-success-(?:ring|glow))$/

function block(selector: string): string {
	const start = css.indexOf(`${selector} {`)
	if (start < 0) throw new Error(`Missing CSS block: ${selector}`)

	const openingBrace = css.indexOf('{', start)
	let depth = 0
	for (let index = openingBrace; index < css.length; index += 1) {
		if (css[index] === '{') depth += 1
		if (css[index] === '}') depth -= 1
		if (depth === 0) return css.slice(openingBrace + 1, index)
	}

	throw new Error(`Unclosed CSS block: ${selector}`)
}

function colorDeclarations(selector: string): Record<string, string> {
	const declarations: Record<string, string> = {}
	const declarationPattern = /(--[\w-]+)\s*:\s*([^;]+);/g

	for (const match of block(selector).matchAll(declarationPattern)) {
		const property = match[1]
		const value = match[2]
		if (property && value && colorProperty.test(property)) {
			declarations[property] = value.replace(/\s+/g, ' ').trim()
		}
	}

	return declarations
}

describe('RahRow color contract', () => {
	it('locks the light palette and semantic remaps', () => {
		expect(colorDeclarations(':root')).toEqual({
			'--background': 'oklch(1 0 0)',
			'--foreground': 'oklch(0.145 0 0)',
			'--card': 'oklch(1 0 0)',
			'--card-foreground': 'oklch(0.145 0 0)',
			'--popover': 'oklch(1 0 0)',
			'--popover-foreground': 'oklch(0.145 0 0)',
			'--primary': 'oklch(0.205 0 0)',
			'--primary-foreground': 'oklch(0.985 0 0)',
			'--secondary': 'oklch(0.97 0 0)',
			'--secondary-foreground': 'oklch(0.205 0 0)',
			'--muted': 'oklch(0.97 0 0)',
			'--muted-foreground': 'oklch(0.556 0 0)',
			'--accent': 'oklch(0.97 0 0)',
			'--accent-foreground': 'oklch(0.205 0 0)',
			'--destructive': 'oklch(0.577 0.245 27.325)',
			'--border': 'oklch(0.922 0 0)',
			'--input': 'oklch(0.922 0 0)',
			'--ring': 'oklch(0.708 0 0)',
			'--chart-1': 'oklch(0.87 0 0)',
			'--chart-2': 'oklch(0.556 0 0)',
			'--chart-3': 'oklch(0.439 0 0)',
			'--chart-4': 'oklch(0.371 0 0)',
			'--chart-5': 'oklch(0.269 0 0)',
			'--sidebar': 'oklch(0.985 0 0)',
			'--sidebar-foreground': 'oklch(0.145 0 0)',
			'--sidebar-primary': 'oklch(0.205 0 0)',
			'--sidebar-primary-foreground': 'oklch(0.985 0 0)',
			'--sidebar-accent': 'oklch(0.97 0 0)',
			'--sidebar-accent-foreground': 'oklch(0.205 0 0)',
			'--sidebar-border': 'oklch(0.922 0 0)',
			'--sidebar-ring': 'oklch(0.708 0 0)',
			'--connection-primary': 'oklch(0.5558 0.2141 269.017)',
			'--connection-primary-foreground': 'oklch(0.985 0 0)',
			'--success': 'var(--connection-primary)',
			'--success-foreground': 'var(--connection-primary-foreground)',
			'--warning': 'var(--secondary)',
			'--warning-foreground': 'var(--secondary-foreground)',
			'--surface': 'var(--card)',
			'--surface-foreground': 'var(--card-foreground)',
			'--surface-floating': 'var(--popover)',
			'--ambient': 'transparent',
			'--surface-static': 'oklch(1 0 0)',
			'--dim': 'var(--muted-foreground)',
			'--glass': 'oklch(1 0 0 / 70%)',
		})
	})

	it('locks the dark palette and semantic remaps', () => {
		expect(colorDeclarations('.dark')).toEqual({
			'--background': 'oklch(0.17 0 0)',
			'--foreground': 'oklch(0.91 0 0)',
			'--card': 'oklch(0.22 0 0)',
			'--card-foreground': 'oklch(0.91 0 0)',
			'--popover': 'oklch(0.2 0 0)',
			'--popover-foreground': 'oklch(0.91 0 0)',
			'--primary': 'oklch(1 0 0)',
			'--primary-foreground': 'oklch(0.18 0 0)',
			'--secondary': 'oklch(0.27 0 0)',
			'--secondary-foreground': 'oklch(0.91 0 0)',
			'--muted': 'oklch(0.24 0 0)',
			'--muted-foreground': 'oklch(0.72 0 0)',
			'--accent': 'oklch(0.28 0 0)',
			'--accent-foreground': 'oklch(0.98 0 0)',
			'--destructive': 'oklch(0.7 0.19 22)',
			'--border': 'oklch(1 0 0 / 12%)',
			'--input': 'oklch(1 0 0 / 14%)',
			'--ring': 'oklch(0.7 0 0)',
			'--chart-1': 'oklch(0.87 0 0)',
			'--chart-2': 'oklch(0.556 0 0)',
			'--chart-3': 'oklch(0.439 0 0)',
			'--chart-4': 'oklch(0.371 0 0)',
			'--chart-5': 'oklch(0.269 0 0)',
			'--sidebar': 'oklch(0.2 0 0)',
			'--sidebar-foreground': 'oklch(0.91 0 0)',
			'--sidebar-primary': 'oklch(1 0 0)',
			'--sidebar-primary-foreground': 'oklch(0.18 0 0)',
			'--sidebar-accent': 'oklch(0.27 0 0)',
			'--sidebar-accent-foreground': 'oklch(0.91 0 0)',
			'--sidebar-border': 'oklch(1 0 0 / 12%)',
			'--sidebar-ring': 'oklch(0.7 0 0)',
			'--connection-primary': 'oklch(0.73 0.17 149)',
			'--connection-primary-foreground': 'oklch(0.16 0.04 150)',
			'--success': 'var(--connection-primary)',
			'--success-foreground': 'var(--connection-primary-foreground)',
			'--warning': 'var(--secondary)',
			'--warning-foreground': 'var(--secondary-foreground)',
			'--surface': 'var(--card)',
			'--surface-foreground': 'var(--card-foreground)',
			'--surface-floating': 'var(--popover)',
			'--ambient': 'transparent',
			'--surface-static': 'oklch(1 0 0)',
			'--dim': 'var(--muted-foreground)',
			'--glass': 'oklch(1 0 0 / 6%)',
		})
	})

	it('keeps connected document state neutral and maps Tailwind semantics', () => {
		expect(css).not.toContain('html[data-connection-state="connected"]')

		expect(colorDeclarations('@theme inline')).toEqual({
			'--color-sidebar-ring': 'var(--sidebar-ring)',
			'--color-sidebar-border': 'var(--sidebar-border)',
			'--color-sidebar-accent-foreground': 'var(--sidebar-accent-foreground)',
			'--color-sidebar-accent': 'var(--sidebar-accent)',
			'--color-sidebar-primary-foreground': 'var(--sidebar-primary-foreground)',
			'--color-sidebar-primary': 'var(--sidebar-primary)',
			'--color-sidebar-foreground': 'var(--sidebar-foreground)',
			'--color-sidebar': 'var(--sidebar)',
			'--color-chart-5': 'var(--chart-5)',
			'--color-chart-4': 'var(--chart-4)',
			'--color-chart-3': 'var(--chart-3)',
			'--color-chart-2': 'var(--chart-2)',
			'--color-chart-1': 'var(--chart-1)',
			'--color-ring': 'var(--ring)',
			'--color-input': 'var(--input)',
			'--color-border': 'var(--border)',
			'--color-destructive': 'var(--destructive)',
			'--color-success-foreground': 'var(--success-foreground)',
			'--color-success': 'var(--success)',
			'--color-warning-foreground': 'var(--warning-foreground)',
			'--color-warning': 'var(--warning)',
			'--color-surface-foreground': 'var(--surface-foreground)',
			'--color-surface': 'var(--surface)',
			'--color-surface-floating': 'var(--surface-floating)',
			'--color-ambient': 'var(--ambient)',
			'--color-surface-static': 'var(--surface-static)',
			'--color-dim': 'var(--dim)',
			'--color-glass': 'var(--glass)',
			'--color-accent-foreground': 'var(--accent-foreground)',
			'--color-accent': 'var(--accent)',
			'--color-muted-foreground': 'var(--muted-foreground)',
			'--color-muted': 'var(--muted)',
			'--color-secondary-foreground': 'var(--secondary-foreground)',
			'--color-secondary': 'var(--secondary)',
			'--color-primary-foreground': 'var(--primary-foreground)',
			'--color-primary': 'var(--primary)',
			'--color-popover-foreground': 'var(--popover-foreground)',
			'--color-popover': 'var(--popover)',
			'--color-card-foreground': 'var(--card-foreground)',
			'--color-card': 'var(--card)',
			'--color-foreground': 'var(--foreground)',
			'--color-background': 'var(--background)',
			'--shadow-success-ring':
				'0 0 0 0.25rem color-mix(in srgb, var(--success) 15%, transparent)',
			'--shadow-success-glow':
				'0 0 2.5rem color-mix(in srgb, var(--success) 12%, transparent)',
		})
	})
})
