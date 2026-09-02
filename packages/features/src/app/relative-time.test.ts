import { afterEach, describe, expect, it } from 'vitest'

import { appI18n } from './app-i18n.tsx'
import { formatRelativeTime } from './relative-time.ts'

const NOW = Date.parse('2026-08-31T12:00:00.000Z')

describe('formatRelativeTime', () => {
	afterEach(async () => {
		await appI18n.changeLanguage('en')
	})

	it('formats near-present and past timestamps relative to an injected clock', () => {
		expect(formatRelativeTime('2026-08-31T11:59:40.000Z', NOW)).toBe('just now')
		expect(formatRelativeTime('2026-08-31T11:55:00.000Z', NOW)).toBe(
			'5 minutes ago',
		)
	})

	it('formats future and day-scale timestamps', () => {
		expect(formatRelativeTime('2026-09-07T12:00:00.000Z', NOW)).toBe('in 1 week')
		expect(formatRelativeTime('2026-08-29T12:00:00.000Z', NOW)).toBe('2 days ago')
	})

	it('uses the selected app locale when callers omit a locale', async () => {
		await appI18n.changeLanguage('fa')

		expect(formatRelativeTime('2026-08-31T10:00:00.000Z', NOW)).toBe('۲ ساعت پیش')
		expect(formatRelativeTime('2026-08-31T11:59:40.000Z', NOW)).toBe('همین حالا')
		expect(formatRelativeTime('not-a-date', NOW)).toBe('هرگز')
	})

	it('honors an explicit locale independently of the current app locale', () => {
		expect(formatRelativeTime('2026-08-31T10:00:00.000Z', NOW, 'fa')).toBe(
			'۲ ساعت پیش',
		)
		expect(formatRelativeTime('not-a-date', NOW, 'fa')).toBe('هرگز')
	})

	it('formats week, month, and year-scale timestamps', () => {
		expect(formatRelativeTime('2026-08-17T12:00:00.000Z', NOW)).toBe(
			'2 weeks ago',
		)
		expect(formatRelativeTime('2026-06-02T12:00:00.000Z', NOW)).toBe(
			'3 months ago',
		)
		expect(formatRelativeTime('2025-08-31T12:00:00.000Z', NOW)).toBe('1 year ago')
	})

	it('fails safely for malformed persisted dates', () => {
		expect(formatRelativeTime('not-a-date', NOW)).toBe('never')
	})
})
