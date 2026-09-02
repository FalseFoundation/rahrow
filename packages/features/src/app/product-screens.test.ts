import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import { PRODUCT_SCREENS } from './product-screens.ts'

const FEATURE_ROOT = dirname(dirname(fileURLToPath(import.meta.url)))
const FEATURE_SCREEN_STEMS = {
	home: 'home/Home',
	profiles: 'profiles/Profiles',
	subscriptions: 'subscriptions/Subscriptions',
	import: 'import/Import',
	settings: 'settings/Settings',
} as const

describe('product screens', () => {
	it('keeps desktop and mobile on the same product screen set', () => {
		expect(PRODUCT_SCREENS.map((screen) => screen.id)).toEqual([
			'home',
			'profiles',
			'subscriptions',
			'import',
			'settings',
		])
	})

	it('uses shared paths for every required screen', () => {
		expect(PRODUCT_SCREENS.map((screen) => screen.path)).toEqual([
			'/',
			'/profiles',
			'/subscriptions',
			'/import',
			'/settings',
		])
	})

	it('pairs every product screen with a colocated CSS Module', () => {
		expect(PRODUCT_SCREENS.map((screen) => screen.id)).toEqual(
			Object.keys(FEATURE_SCREEN_STEMS),
		)

		for (const [id, stem] of Object.entries(FEATURE_SCREEN_STEMS)) {
			const screenPath = join(FEATURE_ROOT, `${stem}.tsx`)
			const stylesPath = join(FEATURE_ROOT, `${stem}.module.css`)

			expect(existsSync(screenPath), `${id} screen`).toBe(true)
			expect(existsSync(stylesPath), `${id} CSS Module`).toBe(true)
			expect(readFileSync(screenPath, 'utf8')).toContain('.module.css')
		}

		expect(existsSync(join(FEATURE_ROOT, 'app/AppShellLayout.tsx'))).toBe(true)
		expect(existsSync(join(FEATURE_ROOT, 'app/AppShellLayout.module.css'))).toBe(
			true,
		)
	})
})
