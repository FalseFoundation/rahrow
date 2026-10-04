---
id: c3a1d5
title: Use concise generic labels for profile and subscription actions
status: done
priority: high
risk: low
createdAt: 2026-09-01 22:38 UTC
updatedAt: 2026-09-01 22:45 UTC
labels:
  - accessibility
  - tooltips
  - copy
  - i18n
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
parent: bf02bf
directories:
  - packages/features/src/profiles
  - packages/features/src/subscriptions
  - packages/features/src/app
projects:
  - rahrow-uiux
  - rahrow-cross-platform-hardening
---

Replace labels such as Actions for {name} and Use {name} with short action-oriented accessible names and tooltips that do not repeat connection/subscription/profile names. Remove obsolete interpolation translations and tests that mandate those phrases while retaining meaningful accessible names for icon-only controls, keyboard focus behavior, localization, and mobile long-press discoverability.
