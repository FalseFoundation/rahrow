---
id: TS-01M0KAM4SWNHAWY6128104MP79
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
  - TS-01M0K4Q9JGNZ65EZT3EG1KX9SQ
  - TS-01M0K4Q9JNV1BJYDXYBWY9Y1KE
parent: TS-01M0K4QND7NDTG1GQPX3B68BPR
directories:
  - apps/mobile
projects:
  - rahrow
---

Define the TypeScript-facing Capacitor VPN contract for Android and iOS before implementing native internals. The contract should expose only connect, disconnect, status, and minimal diagnostics needed by core/app flows, with Android VPN APIs and iOS Network Extension details isolated behind native adapters. Completion requires documented platform limitations, no business logic in Kotlin/Swift, and mockable TypeScript tests for the bridge.
