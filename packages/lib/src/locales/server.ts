// NOTE: Don't export from here - apps should create their own i18n server
// to avoid TypeScript declaration emit issues with complex inferred types.
//
// In your app, create a locales/server.ts:
//
// import { createI18nServer } from 'next-international/server'
// export const { getI18n, getScopedI18n, getStaticParams, getCurrentLocale } =
//   createI18nServer({
//     en: () => import('@rahrow/lib/locales/en'),
//   })

export {}
