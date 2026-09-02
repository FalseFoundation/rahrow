---
id: TS-01M0KAN551CDBRFKBTESVM3VDX
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
  - TS-01M0K4Q9JNV1BJYDXYBWY9Y1KE
  - TS-01M0K4Q9JNYV1EFNZFRFS4N00P
  - TS-01M0K4QFG0Z01XS9KFS1FYZG5W
parent: TS-01M0K4R0P3FQGX31SSNK552055
directories:
  - apps/desktop
  - apps/mobile
projects:
  - rahrow
---

Replace placeholder app shells with connection-oriented Home, Diagnostics, and Settings flows. Home should prioritize current connection state, selected profile, connect/disconnect, latency, and quick profile selection. Diagnostics should expose latency/reachability without implying speed tests. Settings must use the shared settings store and keep application state separate from local UI state.
