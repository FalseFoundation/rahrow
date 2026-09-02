---
id: TS-01M1FD3FBF9EAMB9AWAX0DGA3Q
title: Make every Sonner toast top-aware of headers and drawers
status: done
priority: high
risk: medium
createdAt: 2026-09-01 21:13 UTC
updatedAt: 2026-09-01 21:53 UTC
labels:
  - cross-platform-hardening
  - sonner
  - toasts
  - overlay
  - safe-area
  - accessibility
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
parent: TS-01M1FCY8ZHNE0E843BHX893G1F
directories:
  - packages/ui/src/components/ui
  - packages/features/src/app
  - packages/features/src
projects:
  - rahrow-uiux
  - rahrow-cross-platform-hardening
---

## Contract

Make top-center the global Sonner position. With no drawer open, offset toasts below the sticky ProductHeader plus the top safe-area inset. When any app drawer/sheet is open, place toasts at the viewport top edge plus safe-area inset and above the drawer layer. Remove per-call bottom-center and ad hoc position overrides.

Expose overlay state through one app-level UI contract so nested features do not guess from local drawer state. Preserve stacking, pointer access, close actions, RTL, narrow screens, keyboard focus, and multiple-toast behavior. Do not hard-code one header height when responsive or platform chrome changes.

## Acceptance

Contract tests cover root/nested pages, every shared drawer, stacked overlays, Android/iOS safe areas, macOS/Windows/Linux window sizes, RTL, zoom, and screen-reader announcements. CLI is not applicable.
