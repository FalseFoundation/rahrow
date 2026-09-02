import { readdirSync, readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { describe, expect, it } from 'vitest'

const featureRoot = import.meta.dirname

describe('feature CSS Module ownership', () => {
	it('keeps composed component styles in matching-stem modules', () => {
		const componentPaths = readdirSync(featureRoot, { recursive: true }).filter(
			(path): path is string =>
				typeof path === 'string' &&
				path.endsWith('.tsx') &&
				!path.endsWith('.test.tsx'),
		)

		for (const componentPath of componentPaths) {
			const source = readFileSync(join(featureRoot, componentPath), 'utf8')
			const styleImport = source.match(
				/import styles from ['"]\.\/([^'"]+)\.module\.css['"]/u,
			)
			if (!styleImport) continue

			const componentStem = basename(componentPath, '.tsx')
			expect(styleImport[1], componentPath).toBe(componentStem)
		}
	})

	it('keeps profile layout utilities inside owner modules', () => {
		const profileRoot = join(featureRoot, 'profiles')
		const componentPaths = readdirSync(profileRoot, { recursive: true }).filter(
			(path): path is string =>
				typeof path === 'string' &&
				path.endsWith('.tsx') &&
				!path.endsWith('.test.tsx'),
		)

		for (const componentPath of componentPaths) {
			const source = readFileSync(join(profileRoot, componentPath), 'utf8')
			expect(source, componentPath).not.toMatch(/className=['"][^'"]+['"]/u)
		}
	})
})
