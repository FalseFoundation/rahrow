---
id: 0000243-add-smart-connect-actions-and-transparent-progress-ui
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
  - 0000242-implement-smart-connect-selection-and-five-minute-pacing
parent: 0000239-post-connect-intelligence-and-background-smart-connect
directories:
  - packages/features/src/home
  - packages/features/src/profiles
  - packages/ui/src/components/ui
projects:
  - rahrow-uiux
---

Add one concise icon action in Connections and an equivalent Home entry. Show queued/testing counts, current candidate, winner, next scheduled check, cancellation, failure, and safe switch/reinitialization states without blocking ordinary manual control. Use generic tooltip labels, accessible pressed/busy/status semantics, existing action-button composition, shared desktop/mobile UI, and no profile-name interpolation in tooltips.
