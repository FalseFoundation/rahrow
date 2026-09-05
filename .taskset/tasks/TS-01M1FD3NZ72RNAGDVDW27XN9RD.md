---
id: TS-01M1FD3NZ72RNAGDVDW27XN9RD
title: Persist settings without remounting pages or losing scroll
status: done
priority: urgent
risk: high
createdAt: 2026-09-01 21:13 UTC
updatedAt: 2026-09-02 16:49 UTC
labels:
  - cross-platform-hardening
  - settings
  - state
  - scroll-restoration
  - performance
  - regression
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
related:
  - TS-01M1ARQ689FQD2SJB1K4ZKRYHD
parent: TS-01M1FCY8ZHNE0E843BHX893G1F
directories:
  - packages/features/src/settings
  - packages/features/src/app
  - packages/core/src/storage
  - apps/cli
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-uiux
  - rahrow-cross-platform-hardening
  - rahrow-phase-03-product-state-and-data
---

## Problem

Changing a setting appears to reload the Settings page and returns scroll to the top.

## Work

Trace settingsStore reads/writes, runtime/provider identity, translation callback identity, capability probes, route search updates, drawer close, and component keys. Prevent successful mutations from retriggering the initial-load branch or remounting the route. Keep one stable settings cache/store, update only the changed slice optimistically with rollback, and refresh only affected capability/derived state. Preserve page and drawer scroll/focus across save, background validation, language/theme changes, and reconnect-required prompts.

Do not use a full screen reload for native settings. If a setting requires connection reconfiguration or app restart, say so and route it through the lifecycle transaction rather than silently remounting.

## Acceptance

Tests change every setting at deep scroll positions under slow success/failure, rapid edits, RTL, app resume, and active connection. The page never shows initial skeleton/plain loading or jumps to top after an ordinary save. CLI settings writes remain atomic and do not reset unrelated values.
