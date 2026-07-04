// Export locale definitions - apps import these to create their own i18n client/server
// This avoids TypeScript declaration emit issues with complex inferred types

export * from './cn'
export * from './fetcher'

export { default as CustomFetcher } from './fetcher'
export { default as enLocale } from './locales/en'
// Export i18n types and helpers
export type {
	BaseTranslations,
	DeepMerge,
	I18nKey,
	TranslationKeys,
} from './locales/types'
export { createLocale } from './locales/types'
export * from './math'
export * from './regex'
export * from './slugify'
export { default as yn } from './yn'

// Export locale constants
export const locales = ['en'] as const
export const defaultLocale = 'en' as const
export type Locale = (typeof locales)[number]
