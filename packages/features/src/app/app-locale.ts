export type AppTextDirection = 'ltr' | 'rtl'

export interface AppLocaleMetadata {
	readonly language: string
	readonly label: string
	readonly direction: AppTextDirection
}

export const SUPPORTED_APP_LOCALES = [
	{ language: 'en', label: 'English', direction: 'ltr' },
	{ language: 'fa', label: 'فارسی', direction: 'rtl' },
] as const satisfies readonly AppLocaleMetadata[]

export const DEFAULT_APP_LOCALE: AppLocaleMetadata = SUPPORTED_APP_LOCALES[0]

export function resolveAppLocale(language?: string): AppLocaleMetadata {
	const candidate = language?.trim()
	if (!candidate) return DEFAULT_APP_LOCALE

	const baseLanguage = candidate.split('-')[0]?.toLowerCase()
	const supported = SUPPORTED_APP_LOCALES.find(
		(locale) => locale.language === baseLanguage,
	)

	return supported ?? DEFAULT_APP_LOCALE
}

export function applyDocumentLocale(
	documentElement: Pick<HTMLElement, 'lang' | 'dir'>,
	locale: AppLocaleMetadata,
): void {
	documentElement.lang = locale.language
	documentElement.dir = locale.direction
}
