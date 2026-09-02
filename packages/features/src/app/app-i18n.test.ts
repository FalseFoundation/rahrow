import { afterEach, describe, expect, it } from 'vitest'
import { firstFormError } from '../forms/form-validation.ts'
import { appI18n, changeAppLanguage } from './app-i18n.tsx'
import { englishMessages, persianMessages } from './messages.ts'

describe('app internationalization', () => {
	afterEach(async () => {
		await changeAppLanguage('en')
	})

	it('changes messages and direction from locale metadata', async () => {
		const element = { lang: 'en', dir: 'ltr' }

		await changeAppLanguage('fa-IR', element)

		expect(appI18n.t('app.screens.settings')).toBe('تنظیمات')
		expect(appI18n.t('app.name')).toBe('راهرو')
		expect(appI18n.t('profiles.cleanup.subscriptionSources')).toBe('اشتراک‌ها')
		expect(element).toEqual({ lang: 'fa', dir: 'rtl' })
	})

	it('falls back safely when persisted locale is unsupported', async () => {
		const element = { lang: 'fa', dir: 'rtl' }

		await changeAppLanguage('de-DE', element)

		expect(appI18n.t('app.screens.settings')).toBe('Settings')
		expect(element).toEqual({ lang: 'en', dir: 'ltr' })
	})

	it('formats utility numbers with the selected locale', async () => {
		await changeAppLanguage('fa')

		expect(appI18n.t('latency.failed')).toBe('پینگ ناموفق')
		expect(appI18n.t('ads.seconds', { count: 12 })).toBe('۱۲ ثانیه')
		expect(appI18n.t('latency.measured', { value: 125 })).toBe('۱۲۵ میلی‌ثانیه')
		expect(
			appI18n.t('profiles.speedTest.progress', {
				completed: 2,
				total: 10,
			}),
		).toBe('۲ از ۱۰ کانکشن تست شد')
	})

	it('localizes concise connection action labels without target interpolation', async () => {
		expect(appI18n.t('profiles.actions.more')).toBe('More actions')
		expect(appI18n.t('profiles.actions.use')).toBe('Use connection')

		await changeAppLanguage('fa')

		expect(appI18n.t('profiles.actions.more')).toBe('کارهای بیشتر')
		expect(appI18n.t('profiles.actions.use')).toBe('استفاده از کانکشن')
	})

	it('translates advanced protocol validation labels', async () => {
		await changeAppLanguage('fa')

		expect(firstFormError(['Pinned host key is required'])).toBe(
			'کلید Host را وارد کنید',
		)
		expect(firstFormError(['Upload Mbps must be greater than zero'])).toBe(
			'سرعت آپلود باید بیشتر از صفر باشد',
		)
	})

	it('keeps English and Persian catalogs structurally complete', () => {
		expect(messageKeys(persianMessages)).toEqual(messageKeys(englishMessages))
	})
})

function messageKeys(value: object, prefix = ''): string[] {
	return Object.entries(value)
		.flatMap(([key, entry]) => {
			const path = prefix ? `${prefix}.${key}` : key
			return typeof entry === 'object' && entry !== null
				? messageKeys(entry, path)
				: [path]
		})
		.sort()
}
