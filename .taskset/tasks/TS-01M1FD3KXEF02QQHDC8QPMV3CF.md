---
id: TS-01M1FD3KXEF02QQHDC8QPMV3CF
title: Remove aggregate runtime-limit filler from Diagnostics
status: done
priority: high
risk: medium
createdAt: 2026-09-01 21:13 UTC
updatedAt: 2026-09-01 21:50 UTC
labels:
  - cross-platform-hardening
  - diagnostics
  - copy
  - accessibility
  - regression
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
related:
  - TS-01M1AP3WTK6MGE5ZNTJ4RVVYCA
  - TS-01M19V6CZNHSE4WP5S1ZDAV4D6
parent: TS-01M1FCY8ZHNE0E843BHX893G1F
directories:
  - packages/features/src/diagnostics
  - packages/features/src/app
  - packages/core/src/platform
  - apps/cli
projects:
  - rahrow-uiux
  - rahrow-cross-platform-hardening
---

Remove the aggregate Runtime support is limited / N capabilities unavailable / Available features can still be used filler. Present each engine/capability diagnostic as its own item with title and status/copy action together, followed by the complete description on the next line.

Do not clamp, truncate, duplicate, or replace native detail with generic prose. Preserve wrapping for paths/URLs/unbroken errors, redact secrets at the producer boundary, and keep deterministic copy payloads. CLI diagnostics should present the same per-item information without the visual layout.

Regression tests cover unavailable/failed/ready/standby mixes, missing detail, long native errors, redaction, copy, 320 px, 200% zoom, RTL, and all platform capability producers.
