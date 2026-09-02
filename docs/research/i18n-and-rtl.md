# Internationalization and bidirectional UI

Research date: 2026-08-31

## Decision summary

Use **`i18next` + `react-i18next`** in the shared `@rahrow/features` React layer, with English (`en`) as the fallback/default catalog and Persian (`fa`) as the second bundled catalog. Keep RahRow's existing `settingsStore` as the sole persistence authority for the selected locale; do not add `i18next-browser-languagedetector` initially because its browser-local cache would duplicate the Tauri/Capacitor-aware app setting.

This is the best fit for the current React 19 + Vite desktop/mobile architecture because:

- `react-i18next` supplies a React hook that returns both `t` and the i18next instance, and language changes trigger subscribed component updates ([react-i18next `useTranslation`](https://react.i18next.com/latest/usetranslation-hook)).
- i18next has built-in fallback and supported-language configuration, namespace/resource loading, and an explicit `dir(language)` API that returns `ltr` or `rtl`; direction therefore does not need a Persian-specific condition ([i18next configuration](https://www.i18next.com/overview/configuration-options), [i18next API](https://www.i18next.com/overview/api)).
- Its plural selection follows `Intl.PluralRules`, including languages with more than English's two plural forms, and its Intl-backed formatter handles locale-sensitive dates, numbers, lists, and relative time ([i18next plurals](https://www.i18next.com/translation-function/plurals), [i18next formatting](https://www.i18next.com/translation-function/formatting)).
- The API works both in React and outside components, which is important for route titles, accessibility attributes, toasts, validation, and presentation-layer error messages. `react-i18next` also supports namespaces and `Trans` for messages that contain React elements ([react-i18next guide](https://react.i18next.com/latest/using-with-hooks), [Trans component](https://react.i18next.com/latest/trans-component)).

## Fit with RahRow

RahRow already has the right persistence seam. `Settings.language` exists in `packages/core/src/storage/json-store.ts`; desktop constructs a `JsonSettingsStore` over its Tauri document store, while mobile constructs one over Capacitor Preferences. The locale should be read from that store during app initialization, passed to i18next, and written back through the same store when changed in Settings. This keeps one value consistent with every other app setting and avoids webview-local storage becoming a second source of truth.

Recommended initialization:

1. Create the platform runtime/settings store.
2. Read and validate `settings.language`; accept only the supported locale registry and fall back to `en`.
3. Initialize one shared i18next instance with bundled `en` and `fa` resources, `supportedLngs: ['en', 'fa']`, `fallbackLng: 'en'`, and the persisted `lng`.
4. Before the first visible render, set `<html lang>` from `i18next.resolvedLanguage` and `<html dir>` from `i18next.dir(resolvedLanguage)`, then provide the same direction to shadcn's direction provider.
5. On Settings selection, await `i18next.changeLanguage(locale)`, update document/provider direction, and persist `language` through `settingsStore`. If persistence fails, restore the previous locale and show a localized error.

Waiting for the settings read and i18next initialization before the first visible render avoids a flash of English/LTR around a persisted Persian/RTL UI. If startup cannot read settings, initialize English/LTR and expose a localized recoverable error after the provider is ready.

Use a supported-locale registry rather than scattered checks:

```ts
const locales = {
  en: { label: 'English' },
  fa: { label: 'فارسی' },
} as const

const language = i18n.resolvedLanguage ?? 'en'
const direction = i18n.dir(language)
```

The registry controls what can be selected; `i18n.dir()` controls layout direction. Adding Arabic, Hebrew, Urdu, or another RTL locale then does not require changing layout logic. Preserve valid BCP 47 variants when they are intentionally supported, but resolve them against an explicit supported list rather than accepting arbitrary persisted strings.

Do not persist through both `settingsStore` and a browser detector. The official detector can inspect navigator, query, path, cookie, session storage, and local storage, and can cache the chosen language ([i18next browser language detector](https://github.com/i18next/i18next-browser-languageDetector)). It remains useful later for a browser-only client or a first-run device-locale option; in the current apps, app storage should win and English should be the deterministic fallback.

## RTL and shadcn requirements

shadcn's official RTL workflow sets `"rtl": true` in `components.json`, runs `shadcn migrate rtl` for installed components, and converts physical utilities and props to logical equivalents such as `start`/`end`, `ms`/`me`, and `text-start`. It also calls out icon and animation direction changes ([shadcn RTL guide](https://ui.shadcn.com/docs/rtl), [shadcn CLI migration](https://ui.shadcn.com/docs/cli)). RahRow's `packages/ui/components.json` already declares `"rtl": true`, so retain that for all future generated components and audit the existing component set with the migration.

At runtime, wrap the shared app with `DirectionProvider direction={direction}` and keep it synchronized with the root `lang` and `dir` attributes. The provider is the supported way to set direction for shadcn/Base UI component behavior, while the document attributes cover native layout, text, and assistive technology ([shadcn DirectionProvider](https://ui.shadcn.com/docs/components/base/direction)).

The migration is not the entire audit:

- Review Calendar, Pagination, and Sidebar manually; shadcn identifies them as components needing additional migration attention.
- Pass `dir` explicitly to portal content where necessary; shadcn documents a current logical-animation issue for popovers and tooltips.
- Flip only semantic directional icons (back/forward, chevrons, undo/redo as appropriate), not universal symbols or brand art; shadcn uses `rtl:rotate-180` for this case.
- Treat `left`/`right` as physical only when the product meaning is genuinely physical. Otherwise use inline `start`/`end`, logical margins/padding/borders, and `text-start`/`text-end`.
- Set locale and direction on calendars and other locale-aware widgets, not only on their container; shadcn's Calendar example passes both `locale` and `dir` ([shadcn Calendar RTL](https://ui.shadcn.com/docs/components/base/calendar)). Calendar system choice (Gregorian versus Persian/Jalali) is separate from text direction and should be a deliberate product decision.
- Add a Persian-capable font. shadcn recommends Noto families for RTL scripts; the current Manrope/Geist stack should have an explicit Persian fallback ([shadcn Vite RTL guide](https://ui.shadcn.com/docs/rtl/vite)).

Test both directions at the shared component and feature levels: navigation order, drawers/sheets, menus and portals, sidebars, tables, forms, validation summaries, empty/loading/error states, charts, keyboard focus, truncated text, mixed Persian/Latin values, and narrow mobile layouts. Keep protocol names, hostnames, IP addresses, ports, UUIDs, URLs, and code snippets isolated with `dir="ltr"`/`bdi` where readability requires it; the surrounding interface can remain RTL.

## Message and error policy

- Put every user-visible string in catalogs, including aria labels, placeholders, document titles, confirmations, empty/loading states, validation text, permission failures, toasts, and error recovery actions. Developer logs and raw engine diagnostics remain stable technical text unless deliberately surfaced through a localized presentation layer.
- Prefer stable semantic keys grouped by feature (`settings.language.label`, `profiles.import.invalidUri`) over English sentences as keys. Split catalogs by feature namespace once bundle size or ownership warrants it.
- Do not concatenate translated fragments. Translate a complete sentence with named interpolation, plural rules, or context so Persian word order can differ safely. i18next escapes interpolated values by default; keep that protection unless React already owns the exact rendering boundary ([i18next interpolation](https://www.i18next.com/translation-function/interpolation)).
- Domain and platform layers should return stable error codes plus safe parameters. The feature/UI layer maps those codes to translations. Unknown errors use a localized generic fallback and must not expose credentials, subscription URLs, or raw configs.
- Add catalog parity checks in CI and tests that fail on missing English/Persian keys. Exercise plural categories, interpolation, direction changes, persistence/restart, and fallback behavior.

## Alternatives considered

| Option | Strength | Why not the default here |
| --- | --- | --- |
| Lingui | Strong PO/translator workflow, extraction/compile validation, React macros, rich text, and an official Vite plugin ([Lingui overview](https://lingui.dev/), [Lingui Vite plugin](https://lingui.dev/ref/vite-plugin)) | Adds a compile/macro/catalog workflow during an already broad migration; direction and RahRow storage integration remain app-owned. Prefer it if PO-based extraction and translator tooling become the dominant requirement. |
| FormatJS / `react-intl` | ICU messages and first-class Intl formatting; imperative API works for attributes, errors, and non-React call sites ([React Intl](https://formatjs.github.io/docs/react-intl/), [imperative API](https://formatjs.github.io/docs/react-intl/api/)); official CLI supports extraction ([message extraction](https://formatjs.github.io/docs/getting-started/message-extraction/)) | It does not provide the equivalent of i18next's direction helper or a first-party locale detection/persistence policy, so RahRow must build more coordination code. It is attractive if ICU-first authoring/extraction outweighs that cost. |

The recommendation is intentionally not a home-grown context plus object lookup. Correct plural categories, interpolation, fallback, resource loading, React subscriptions, non-component access, and direction handling are mature library concerns; recreating them would increase the number of localization edge cases RahRow owns.
