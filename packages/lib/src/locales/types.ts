// Type utilities for i18n
import type en from './en'
import baseEn from './en'

export type BaseTranslations = typeof en
export type TranslationKeys = typeof en
export type NestedKeyOf<T> = T extends object
	? {
			[K in keyof T]-?: K extends string
				? T[K] extends object
					? `${K}` | `${K}.${NestedKeyOf<T[K]>}`
					: `${K}`
				: never
		}[keyof T]
	: never

export type I18nKey = NestedKeyOf<TranslationKeys>

// Deep merge type for combining base + app translations
export type DeepMerge<T, U> = {
	[K in keyof T | keyof U]: K extends keyof U
		? K extends keyof T
			? T[K] extends object
				? U[K] extends object
					? DeepMerge<T[K], U[K]>
					: U[K]
				: U[K]
			: U[K]
		: K extends keyof T
			? T[K]
			: never
}

// Deep merge function for runtime
function deepMerge<T extends object, U extends object>(base: T, override: U): DeepMerge<T, U> {
	const result = { ...base } as Record<string, unknown>
	for (const key of Object.keys(override)) {
		const baseVal = (base as Record<string, unknown>)[key]
		const overrideVal = (override as Record<string, unknown>)[key]
		if (
			baseVal &&
			typeof baseVal === 'object' &&
			!Array.isArray(baseVal) &&
			overrideVal &&
			typeof overrideVal === 'object' &&
			!Array.isArray(overrideVal)
		) {
			result[key] = deepMerge(baseVal as object, overrideVal as object)
		} else {
			result[key] = overrideVal
		}
	}
	return result as DeepMerge<T, U>
}

/**
 * Create a locale by merging app-specific translations with base translations.
 * App translations override/extend the base.
 *
 * @example
 * // app/locales/en.ts
 * import { createLocale } from '@rahrow/lib'
 * export default createLocale({
 *   app: { title: 'My App' },
 *   common: { welcome: 'Hey there!' }, // override base
 * })
 */
export function createLocale<T extends object>(appTranslations: T): DeepMerge<BaseTranslations, T> {
	return deepMerge(baseEn, appTranslations)
}
