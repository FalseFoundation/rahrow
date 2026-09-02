import { DirectionProvider } from '@rahrow/ui/components/ui/direction.tsx'
import i18next, { type i18n, type TOptions } from 'i18next'
import { type ReactNode, useEffect, useState } from 'react'
import {
	I18nextProvider,
	initReactI18next,
	useTranslation,
} from 'react-i18next'

import {
	applyDocumentLocale,
	DEFAULT_APP_LOCALE,
	resolveAppLocale,
} from './app-locale.ts'
import { englishMessages, persianMessages } from './messages.ts'

export const appI18n: i18n = i18next.createInstance()

let rtlFontPromise: Promise<unknown> | undefined

function ensureLocaleFont(direction: 'ltr' | 'rtl'): Promise<unknown> {
	if (direction !== 'rtl') return Promise.resolve()
	rtlFontPromise ??= import('@rahrow/static/fonts/Estedad/estedad.css')
	return rtlFontPromise
}

void appI18n.use(initReactI18next).init({
	resources: {
		en: { translation: englishMessages },
		fa: { translation: persianMessages },
	},
	lng: DEFAULT_APP_LOCALE.language,
	fallbackLng: DEFAULT_APP_LOCALE.language,
	supportedLngs: ['en', 'fa'],
	nonExplicitSupportedLngs: true,
	load: 'languageOnly',
	initAsync: false,
	interpolation: { escapeValue: false },
	returnNull: false,
})

export function translate(key: string, options?: TOptions): string {
	return appI18n.t(key, options)
}

export function resolveFormattingLocale(locale?: string): string {
	return resolveAppLocale(locale ?? appI18n.resolvedLanguage).language
}

export function useAppTranslation() {
	return useTranslation(undefined, { i18n: appI18n })
}

export async function changeAppLanguage(
	language: string | undefined,
	documentElement: Pick<HTMLElement, 'lang' | 'dir'> = document.documentElement,
): Promise<string> {
	const locale = resolveAppLocale(language)
	await ensureLocaleFont(locale.direction)
	await appI18n.changeLanguage(locale.language)
	const resolved = resolveAppLocale(appI18n.resolvedLanguage)
	applyDocumentLocale(documentElement, {
		...resolved,
		direction: appI18n.dir(resolved.language),
	})
	return resolved.language
}

export function AppLocaleProvider({
	children,
}: {
	readonly children: ReactNode
}) {
	const [language, setLanguage] = useState(
		() => resolveAppLocale(appI18n.resolvedLanguage).language,
	)

	useEffect(() => {
		const handleLanguageChanged = (nextLanguage: string) => {
			setLanguage(resolveAppLocale(nextLanguage).language)
		}
		appI18n.on('languageChanged', handleLanguageChanged)
		return () => {
			appI18n.off('languageChanged', handleLanguageChanged)
		}
	}, [])

	return (
		<I18nextProvider i18n={appI18n}>
			<DirectionProvider direction={appI18n.dir(language)}>
				{children}
			</DirectionProvider>
		</I18nextProvider>
	)
}
