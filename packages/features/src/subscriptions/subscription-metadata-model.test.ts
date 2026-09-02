import { afterEach, describe, expect, it } from 'vitest'

import { appI18n } from '../app/app-i18n.tsx'
import {
	formatSubscriptionDate,
	summarizeSubscriptionUsage,
} from './subscription-metadata-model.ts'

describe('summarizeSubscriptionUsage', () => {
	afterEach(async () => {
		await appI18n.changeLanguage('en')
	})

	it('omits quota without a positive total and clamps overuse', () => {
		expect(summarizeSubscriptionUsage({ downloadBytes: 10 })).toBeUndefined()
		expect(summarizeSubscriptionUsage({ totalBytes: 0 })).toBeUndefined()
		expect(
			summarizeSubscriptionUsage({
				uploadBytes: 800,
				downloadBytes: 800,
				totalBytes: 1_000,
			})?.percent,
		).toBe(100)
	})

	it('formats quota values and utility labels in the selected locale', async () => {
		const summary = summarizeSubscriptionUsage(
			{
				uploadBytes: 512 * 1024,
				downloadBytes: 512 * 1024,
				totalBytes: 2 * 1024 * 1024,
			},
			'fa',
		)

		expect(summary?.label).toContain('۱')
		expect(summary?.label).toContain('مگ')
		expect(summary?.label).toContain('۲')
		expect(summary?.label).toContain('مصرف‌شده')
	})

	it('uses the familiar Persian gigabyte label', () => {
		const summary = summarizeSubscriptionUsage(
			{
				downloadBytes: 512 * 1024 ** 2,
				totalBytes: 1024 ** 3,
			},
			'fa',
		)

		expect(summary?.label).toContain('گیگ')
		expect(summary?.label).not.toContain('GB')
	})

	it('formats persisted dates in the selected locale and fails safely', async () => {
		await appI18n.changeLanguage('fa')

		expect(formatSubscriptionDate('2026-08-31T12:00:00.000Z')).toMatch(/[۰-۹]/)
		expect(formatSubscriptionDate('not-a-date')).toBe('هرگز')
	})
})
