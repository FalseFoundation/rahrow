---
id: TS-01M0K4QFG0Z01XS9KFS1FYZG5W
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
  - TS-01M0K4Q9JGNZ65EZT3EG1KX9SQ
  - TS-01M0K4Q9JNV1BJYDXYBWY9Y1KE
directories:
  - apps/desktop
projects:
  - rahrow
---

Wire desktop app to core/engine through Tauri commands for Xray sidecar lifecycle, tray/autostart, clipboard/share/QR/system integration, keeping Rust minimal and platform-only.
