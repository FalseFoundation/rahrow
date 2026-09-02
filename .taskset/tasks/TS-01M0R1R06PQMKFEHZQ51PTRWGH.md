---
id: TS-01M0R1R06PQMKFEHZQ51PTRWGH
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
  - TS-01M0R1QTMKC2ZR4YFG2164MNDC
parent: TS-01M0R1JWTN9Y1BGD7D1ENK041D
directories:
  - apps/desktop
projects:
  - rahrow-desktop
---

Replace unsupported stubs with real macOS/Windows/Linux implementations where possible. If an OS requires signed entitlements, keep that OS path blocked with an explicit diagnostic.

Acceptance: capability status is truthful; UI settings toggle only supported capabilities.
