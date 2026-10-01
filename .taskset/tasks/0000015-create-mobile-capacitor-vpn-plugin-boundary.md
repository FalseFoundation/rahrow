---
id: 0000015-create-mobile-capacitor-vpn-plugin-boundary
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
  - 0000002-implement-xray-configuration-builder-and-process-boundary
  - 0000004-implement-shared-connection-lifecycle-orchestration
parent: 0000007-implement-mobile-vpn-platform-boundary
directories:
  - apps/mobile
projects:
  - rahrow
---

Define the TypeScript-facing Capacitor VPN contract for Android and iOS before implementing native internals. The contract should expose only connect, disconnect, status, and minimal diagnostics needed by core/app flows, with Android VPN APIs and iOS Network Extension details isolated behind native adapters. Completion requires documented platform limitations, no business logic in Kotlin/Swift, and mockable TypeScript tests for the bridge.
