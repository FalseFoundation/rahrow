---
id: f6f4c3
title: Implement desktop platform capabilities
status: done
priority: medium
risk: high
createdAt: 2026-08-21 23:31 UTC
updatedAt: 2026-08-22 01:55 UTC
labels:
  - phase-8
  - desktop
  - platform
dependsOn:
  - 6d1387
  - "0618e9"
parent: ae97ba
directories:
  - apps/desktop
projects:
  - rahrow
---

Add desktop implementations for the small platform contracts that the product UX actually uses: clipboard import/export, share where supported, QR encode/decode handoff, tray, autostart, notifications, and system proxy controls. Do not create a giant PlatformService or duplicate protocol logic inside platform code. Completion requires capability-level tests or mocks, clear unsupported-capability behavior, and docs for platform limitations.
