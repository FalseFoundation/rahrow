---
id: 0000206-remove-locale-direction-startup-and-navigation-races
title: Remove locale-direction startup and navigation races
status: done
priority: urgent
risk: high
createdAt: 2026-09-01 21:13 UTC
updatedAt: 2026-09-02 16:49 UTC
labels:
  - cross-platform-hardening
  - i18n
  - rtl
  - hydration
  - startup
  - regression
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
parent: 0000203-harden-reported-behavior-across-every-rahrow-platform
directories:
  - packages/features/src/app
  - packages/features/src/settings
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-uiux
  - rahrow-cross-platform-hardening
  - rahrow-phase-03-product-state-and-data
---

## Problem

English sometimes renders with RTL direction or another language/direction appears transiently.

## Work

Audit bootstrap ordering across static index.html, persisted settings, i18next initialization, DirectionProvider, document lang/dir, route lazy loading, app resume, and settings writes. Establish one resolved-locale snapshot before the first interactive render; apply the same locale atomically to messages, DirectionProvider, documentElement.lang/dir, formatting, and font loading. Prevent stale async reads and languageChanged events from winning after a newer selection.

Treat this as a startup/state synchronization regression, not server hydration terminology: the apps are Vite WebViews, but pre-render/default markup can still flash or race persisted state.

## Acceptance

Cold/warm launch, navigation, resume, failed/corrupt settings, rapid EN↔FA changes, system locale changes, and reset are deterministic with no EN+RTL or FA+LTR frame after readiness. Test Android/iOS and macOS/Windows/Linux shells. CLI uses the same resolved locale for output direction only where terminal localization is supported; otherwise document CLI non-applicability. Relate to the prior locale seam without assuming its done status proves the regression fixed.
