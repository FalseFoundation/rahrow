import { describe, expect, it } from 'vitest'

import {
	applyDocumentLocale,
	DEFAULT_APP_LOCALE,
	resolveAppLocale,
} from './app-locale.ts'

describe('app locale metadata', () => {
	it('normalizes supported regional language tags to stable locale keys', () => {
		expect(resolveAppLocale('en-US')).toEqual({
			language: 'en',
			label: 'English',
			direction: 'ltr',
		})
		expect(resolveAppLocale('fa-IR')).toEqual({
			language: 'fa',
			label: 'فارسی',
			direction: 'rtl',
		})
	})

	it('fails safely to English for absent or unsupported persisted locales', () => {
		expect(resolveAppLocale()).toEqual(DEFAULT_APP_LOCALE)
		expect(resolveAppLocale('de-DE')).toEqual(DEFAULT_APP_LOCALE)
	})

	it('applies both language and direction to the document element', () => {
		const element = { lang: 'en', dir: 'ltr' }
		applyDocumentLocale(element, resolveAppLocale('fa-IR'))
		expect(element).toEqual({ lang: 'fa', dir: 'rtl' })
	})
})
