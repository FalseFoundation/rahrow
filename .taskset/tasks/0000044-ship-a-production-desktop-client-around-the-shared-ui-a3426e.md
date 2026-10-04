---
id: a3426e
title: Ship a production desktop client around the shared UI
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:29 UTC
updatedAt: 2026-08-23 22:47 UTC
labels:
  - prod-v2
  - desktop
  - native
  - p0-blocker
dependsOn:
  - 761c27
  - a27174
  - 928ff0
related:
  - 61ed96
parent: 713ce0
directories:
  - apps/desktop
  - packages/engine
projects:
  - rahrow-desktop
---

Epic: Tauri desktop shell must run the shared features UI, persist data, start the Xray sidecar, and implement native capabilities.

Acceptance: Connect works against a real sidecar; tray, autostart, system proxy, and notifications are implemented or explicitly remain blocked behind signing; the rendered product UI is the packages/features UI, not a desktop-only layout.
