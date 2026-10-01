---
id: 0000020-build-connection-home-diagnostics-and-settings-ux
title: Build connection home diagnostics and settings UX
status: done
priority: medium
risk: medium
createdAt: 2026-08-21 23:31 UTC
updatedAt: 2026-08-22 02:16 UTC
labels:
  - phase-11
  - ui
  - lifecycle
  - diagnostics
  - settings
dependsOn:
  - 0000004-implement-shared-connection-lifecycle-orchestration
  - 0000005-implement-local-profile-and-settings-persistence
  - 0000006-implement-desktop-platform-integrations
parent: 0000009-build-connection-oriented-desktop-and-mobile-ux
directories:
  - apps/desktop
  - apps/mobile
projects:
  - rahrow
---

Replace placeholder app shells with connection-oriented Home, Diagnostics, and Settings flows. Home should prioritize current connection state, selected profile, connect/disconnect, latency, and quick profile selection. Diagnostics should expose latency/reachability without implying speed tests. Settings must use the shared settings store and keep application state separate from local UI state.
