---
id: TS-01M1FPMKEFSH5W376SZGS0EB9D
title: Make all tooltip content non-selectable
status: done
priority: medium
risk: low
createdAt: 2026-09-01 23:59 UTC
updatedAt: 2026-09-02 00:04 UTC
labels:
  - tooltip
  - accessibility
  - ui
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
parent: TS-01M1FPJKQ2DC8PQANDK2RVA27C
directories:
  - packages/ui/src/components/ui
projects:
  - rahrow-uiux
---

Set non-selection at the shared TooltipContent primitive so every consumer inherits it without feature-local classes. Preserve keyboard focus, pointer events, screen-reader naming, copy behavior outside tooltips, and shared desktop/mobile visual parity. Add a primitive contract test.
