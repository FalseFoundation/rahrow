---
id: ae97ba
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
  - e09c0b
  - 1ae453
directories:
  - apps/desktop
projects:
  - rahrow
---

Wire desktop app to core/engine through Tauri commands for Xray sidecar lifecycle, tray/autostart, clipboard/share/QR/system integration, keeping Rust minimal and platform-only.
