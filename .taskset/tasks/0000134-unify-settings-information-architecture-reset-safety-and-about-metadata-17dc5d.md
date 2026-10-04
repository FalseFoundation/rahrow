---
id: 17dc5d
title: Unify Settings information architecture, reset safety, and About metadata
status: done
priority: high
risk: high
createdAt: 2026-08-30 19:59 UTC
updatedAt: 2026-09-02 17:14 UTC
labels:
  - settings
  - ui-system
  - native
  - privacy
  - screenshot-spec
parent: "542944"
directories:
  - apps
  - packages
projects:
  - rahrow
  - rahrow-phase-02-light-ui-and-copy
---

Purpose

Create a coherent RahRow Settings system whose task specification stands alone without the V2Box reference screenshots. Reuse RahRow's global page shell, header, search behavior, safe-area rules, full-width subpage layout, and bottom-left back affordance. Do not reproduce V2Box branding, ornamental desktop traffic lights, persistent connect bar, or its tab bar on Settings subpages.

Reference-screen inventory to account for

Settings root:
- Device section with Language selector.
- A copyable Device ID (HWID), note that it changes on reinstall, and Reset navigation.
- Settings rows including Appearance, Tunnel Settings, and DNS Settings.
- Bottom connection status/action and Home, Configs, Settings navigation shown by the reference.

Reset:
- Reset Tunnel Configuration.
- Reset Settings, described as resetting settings only.
- Reset App Data, described as resetting the entire database.

About:
- App Version and build number.
- Xray Core Version.
- URL Schemes.
- Rate app, Telegram Community, and Privacy Policy.
- Product description and category grouping.

RahRow product decisions

1. Build one typed settings registry. Each entry declares title, description, icon, route, search keywords, platform/capability predicate, restart or reconnect effect, sensitivity, and reset scope. The same registry drives Settings rows, settings search, route metadata, and diagnostics. Unsupported features are omitted rather than displayed disabled.
2. Use one ProductHeader/AppPage shell for root and subpages. Respect safe-area padding at the viewport layer so headers touch the intended mobile edges. Settings subpages use a back affordance at the bottom-left navigation location and do not show normal bottom-tab items. Avoid unnecessary outer cards that reduce usable space.
3. Language is shown only when localization infrastructure and at least two selectable locales exist. Persist a stable locale key and fall back safely when a locale disappears.
4. Do not collect or expose a hardware-derived ID. If subscription interoperability later requires a stable identifier, use a resettable random installation identifier stored securely, label it truthfully, document exactly when it is transmitted, keep transmission off by default, and never call it HWID.
5. Reset operations are three explicit scopes:
   - Tunnel configuration: disconnect safely, remove applied native routes/proxy/VPN state, restore tunnel defaults, preserve connections/subscriptions and unrelated app preferences.
   - Settings: restore app and engine preferences to current defaults, preserve connections/subscriptions, secrets, history unless separately disclosed, and clear transient UI state.
   - App data: disconnect, remove profiles, subscriptions, quota/speed history, logs, cached imports, settings, stored credentials and native tunnel configuration. Explain whether an installation identifier is regenerated.
6. Every destructive reset requires a scope-specific confirmation listing retained/deleted data. Prevent double submission, show progress, perform storage/native cleanup transactionally where possible, report partial cleanup with recovery guidance, and restart/reload only when required.
7. About derives app version/build and bundled engine versions from build/runtime manifests, not hard-coded strings. Show all installed/available engines rather than only Xray. Include open-source licenses/notices, Privacy Policy, diagnostic/version copy action, and official support links only if configured.
8. Show URL Schemes only for schemes actually registered by Tauri/Capacitor/native manifests. Document supported import/deep-link shapes, redact secrets from previews/telemetry, validate origins and payload size, and require confirmation before importing.
9. “Rate app” is platform-gated to store builds with a valid listing. Community links are configuration-driven. External links open through the platform-safe browser API.
10. Connection controls belong to the global navigation/home experience, not as an overlapping footer in every Settings subpage.

Implementation scope

- Add the settings registry and route/capability integration.
- Refactor root and subpages to the shared page/header/navigation primitives.
- Implement reset orchestration across shared storage, secure storage, engine runtime, Tauri, and Capacitor adapters.
- Add manifest-derived About data and safe external-link/deep-link handling.
- Add accessible copy feedback via the global Sonner toast service.
- Migrate existing settings values without silently changing unrelated user data.

Acceptance criteria

- Every Settings item has an explicit capability predicate and unsupported rows are absent on each OS.
- Root/subpage headers, search, safe-area spacing, back behavior, focus order, and keyboard navigation are consistent on desktop and mobile.
- Reset tests prove the exact retained/deleted matrix for all three scopes, including active-tunnel cleanup, secure credentials, failure recovery, and idempotency.
- App/engine versions match build/runtime manifests; missing engine/version data renders as unavailable only when the item remains actionable.
- No hardware fingerprint is generated or transmitted by default.
- Registered URL schemes are tested for valid, invalid, oversized, and secret-bearing payloads.
- Links, confirmations, copy actions, loading state, errors, and reduced-motion behavior meet accessibility requirements.
- Tests cover platform capability matrices, persistence migrations, navigation snapshots, and native cleanup adapters.


Settings-root completeness

The root registry/navigation includes Reset, Appearance, Tunnel Settings, DNS Settings, Advanced Settings, and About when their destination has meaningful supported content. Appearance links to RahRow's existing theme task rather than duplicating it. Advanced Settings contains only capability-backed entries such as LAN sharing or approved on-demand policies. About remains available wherever version/legal information can be shown. Copy actions announce success accessibly and never copy a hardware fingerprint.
