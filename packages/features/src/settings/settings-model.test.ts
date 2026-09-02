import { describe, expect, it } from 'vitest'

import {
	persistableBoolean,
	settingsQueryMatches,
	toggleDisabled,
} from './settings-model.ts'

describe('settings-model', () => {
	it('matches settings sections without case or surrounding whitespace', () => {
		expect(settingsQueryMatches(' START ', ['Launch at startup'])).toBe(true)
		expect(
			settingsQueryMatches('logs', ['Appearance', 'Diagnostics and logs']),
		).toBe(true)
		expect(settingsQueryMatches('account', ['Appearance', 'Diagnostics'])).toBe(
			false,
		)
	})

	it('does not persist or enable unsupported capability toggles', () => {
		expect(
			persistableBoolean(true, { supported: false, detail: 'unsigned build' }),
		).toBe(false)
		expect(toggleDisabled({ supported: false })).toBe(true)
	})

	it('persists supported capability toggles that the user requested', () => {
		expect(persistableBoolean(true, { supported: true })).toBe(true)
		expect(toggleDisabled({ supported: true })).toBe(false)
	})
})
