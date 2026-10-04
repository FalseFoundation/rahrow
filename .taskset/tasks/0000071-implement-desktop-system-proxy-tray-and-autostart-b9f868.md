---
id: b9f868
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
  - c8c2a0
parent: a3426e
directories:
  - apps/desktop
projects:
  - rahrow-desktop
---

Replace unsupported stubs with real macOS/Windows/Linux implementations where possible. If an OS requires signed entitlements, keep that OS path blocked with an explicit diagnostic.

Acceptance: capability status is truthful; UI settings toggle only supported capabilities.
