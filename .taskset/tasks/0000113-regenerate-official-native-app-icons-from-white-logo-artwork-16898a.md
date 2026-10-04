---
id: 16898a
title: Regenerate official native app icons from white logo artwork
status: done
priority: high
risk: medium
createdAt: 2026-08-29 19:14 UTC
updatedAt: 2026-08-29 19:20 UTC
labels:
  - branding
  - tauri
  - capacitor
parent: e1b2fd
directories:
  - packages/static
  - apps/desktop/src-tauri
  - apps/mobile/android
  - apps/mobile/ios
projects:
  - rahrow-uiux
---

Use the official -white logo artwork as the source for Tauri and Capacitor app icon generation. Where native platforms support appearance-specific app icons, provide correct light and dark variants without reducing compatibility; otherwise choose a static background and white mark with adequate contrast. Regenerate checked-in icon sets and document the source and commands.
