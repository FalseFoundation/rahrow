---
id: TS-01M1AB3KH64G3YWP3WDZJZ2T2Q
title: Polish mobile shell, responsive drawers, and state continuity
status: done
priority: high
risk: medium
createdAt: 2026-08-30 22:02 UTC
updatedAt: 2026-08-30 22:17 UTC
labels:
  - ui
  - mobile-first
  - polish
related:
  - TS-01M1A8DW05SXPM1X974A6V65ET
directories:
  - packages/features
  - packages/ui
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-uiux
---

Fix the shared UI as one coherent pass: lock desktop width to 393 CSS px; align shell, headers, navigation, and bottom bars; reduce horizontal padding; make the whole app and drawer bodies vertically scrollable; give drawers a useful minimum height and pinned action footer; hide empty profile groups and show one collection-level empty state; use compact trailing chevrons, truncation, relative subscription dates, and better add/action iconography; compact Diagnostics refresh into the Runtime health heading; regroup Settings; align selected/power card radii; preserve destructive action emphasis; persist theme correctly in Tauri; prevent initial empty-state flashes; avoid button-as-anchor link exposure; and show Proxy mode when VPN is unavailable.
