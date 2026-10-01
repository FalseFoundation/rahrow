---
id: 0000006-implement-desktop-platform-integrations
title: Implement desktop platform integrations
status: done
priority: medium
risk: high
createdAt: 2026-08-21 21:48 UTC
updatedAt: 2026-08-22 01:57 UTC
labels:
  - phase-8
  - desktop
dependsOn:
  - 0000002-implement-xray-configuration-builder-and-process-boundary
  - 0000004-implement-shared-connection-lifecycle-orchestration
directories:
  - apps/desktop
projects:
  - rahrow
---

Wire desktop app to core/engine through Tauri commands for Xray sidecar lifecycle, tray/autostart, clipboard/share/QR/system integration, keeping Rust minimal and platform-only.
