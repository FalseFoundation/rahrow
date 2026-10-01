---
id: 0000212-shorten-failed-latency-labels-in-every-locale
title: Shorten failed-latency labels in every locale
status: done
priority: medium
risk: low
createdAt: 2026-09-01 21:13 UTC
updatedAt: 2026-09-01 21:44 UTC
labels:
  - cross-platform-hardening
  - i18n
  - latency
  - ux-copy
  - profiles
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
parent: 0000203-harden-reported-behavior-across-every-rahrow-platform
directories:
  - packages/features/src/app
  - packages/features/src/profiles
  - packages/features/src/home
projects:
  - rahrow-uiux
  - rahrow-cross-platform-hardening
---

Replace verbose failed-ping labels with the shortest unambiguous localized status that fits profile cards: Persian پینگ ناموفق and equivalent concise wording in every supported locale (English should be Failed ping or a shorter product-approved equivalent). Keep timeout, unreachable, canceled, and unavailable semantically distinct.

Test translated width/fallback behavior at narrow mobile widths, RTL, dynamic font scaling, and desktop shells. Do not truncate the status into ambiguity. CLI should reuse the concise localized status if localized output is enabled; otherwise visual width constraints are not applicable.
