---
id: 0000014-implement-desktop-platform-capabilities
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
  - 0000003-implement-import-pipeline-and-subscription-parsing
  - 0000005-implement-local-profile-and-settings-persistence
parent: 0000006-implement-desktop-platform-integrations
directories:
  - apps/desktop
projects:
  - rahrow
---

Add desktop implementations for the small platform contracts that the product UX actually uses: clipboard import/export, share where supported, QR encode/decode handoff, tray, autostart, notifications, and system proxy controls. Do not create a giant PlatformService or duplicate protocol logic inside platform code. Completion requires capability-level tests or mocks, clear unsupported-capability behavior, and docs for platform limitations.
