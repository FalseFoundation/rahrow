---
id: 1b26eb
title: Move route headers into a static app-shell chrome slot
status: done
priority: high
risk: high
createdAt: 2026-09-01 22:42 UTC
updatedAt: 2026-09-01 23:00 UTC
labels:
  - app-shell
  - header
  - composition
  - scroll-ownership
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
dependsOn:
  - cc6812
parent: bf02bf
directories:
  - packages/features/src/app
  - packages/features/src/home
  - packages/features/src/profiles
  - packages/features/src/subscriptions
  - packages/features/src/settings
projects:
  - rahrow-uiux
---

Refactor the shared feature shell so each route composes header content into a static shell row, while only the stretched route body owns scrolling and the tab bar remains a static final row. Preserve route-specific actions, search, nested back navigation, focus order, lazy loading, virtualization scroll context, safe areas, and desktop/mobile parity. Avoid a UI-package dependency on product chrome and avoid a global header registry that remounts routes or resets scroll.
