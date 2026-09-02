---
id: TS-01M1FPKWMPW2PHET822W5BTMDV
title: Add Smart Connect actions and transparent progress UI
status: done
priority: high
risk: high
createdAt: 2026-09-01 23:59 UTC
updatedAt: 2026-09-02 00:34 UTC
labels:
  - smart-connect
  - uiux
  - action-button
  - home
  - connections
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
dependsOn:
  - TS-01M1FPKW9GTAEBR2TXMXSZXVJD
parent: TS-01M1FPJKQ2DC8PQANDK2RVA27C
directories:
  - packages/features/src/home
  - packages/features/src/profiles
  - packages/ui/src/components/ui
projects:
  - rahrow-uiux
---

Add one concise icon action in Connections and an equivalent Home entry. Show queued/testing counts, current candidate, winner, next scheduled check, cancellation, failure, and safe switch/reinitialization states without blocking ordinary manual control. Use generic tooltip labels, accessible pressed/busy/status semantics, existing action-button composition, shared desktop/mobile UI, and no profile-name interpolation in tooltips.
