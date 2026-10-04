---
id: a79353
title: Create mobile Capacitor VPN plugin boundary
status: done
priority: high
risk: high
createdAt: 2026-08-21 23:31 UTC
updatedAt: 2026-08-22 01:59 UTC
labels:
  - phase-9
  - mobile
  - vpn
  - capacitor
dependsOn:
  - e09c0b
  - 1ae453
parent: a0da13
directories:
  - apps/mobile
projects:
  - rahrow
---

Define the TypeScript-facing Capacitor VPN contract for Android and iOS before implementing native internals. The contract should expose only connect, disconnect, status, and minimal diagnostics needed by core/app flows, with Android VPN APIs and iOS Network Extension details isolated behind native adapters. Completion requires documented platform limitations, no business logic in Kotlin/Swift, and mockable TypeScript tests for the bridge.
