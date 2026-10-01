---
id: 0000071-implement-desktop-system-proxy-tray-and-autostart
title: Implement desktop system proxy, tray, and autostart
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:32 UTC
updatedAt: 2026-08-23 22:47 UTC
labels:
  - prod-v2
  - desktop
  - native
  - p1-product
dependsOn:
  - 0000068-mount-the-shared-ui-in-a-thin-desktop-shell
parent: 0000044-ship-a-production-desktop-client-around-the-shared-ui
directories:
  - apps/desktop
projects:
  - rahrow-desktop
---

Replace unsupported stubs with real macOS/Windows/Linux implementations where possible. If an OS requires signed entitlements, keep that OS path blocked with an explicit diagnostic.

Acceptance: capability status is truthful; UI settings toggle only supported capabilities.
