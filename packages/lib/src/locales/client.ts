// NOTE: Don't export from here - apps should create their own i18n client
// to avoid TypeScript declaration emit issues with complex inferred types.
//
// In your app, create a locales/client.ts:
//
// 'use client'
// import { createI18nClient } from 'next-international/client'
// export const { useI18n, useScopedI18n, I18nProviderClient, useCurrentLocale, useChangeLocale } =
//   createI18nClient({
//     en: () => import('@rahrow/lib/locales/en'),
//   })

export {}
