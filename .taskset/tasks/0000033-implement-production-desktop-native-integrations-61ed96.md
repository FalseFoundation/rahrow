---
id: 61ed96
title: Implement production desktop native integrations
status: done
priority: high
risk: high
createdAt: 2026-08-23 17:29 UTC
updatedAt: 2026-08-23 18:57 UTC
labels:
  - prod-grade
  - desktop
  - xray-runtime
  - p0-release-blocker
dependsOn:
  - 73122e
parent: 9395f1
directories:
  - apps/desktop
  - packages/engine
projects:
  - rahrow-interfaces
---

Implement production desktop native integrations. Acceptance: Tauri commands bridge only native/process capabilities; desktop supports Xray sidecar start/stop/status through a host-provided binary, explicit diagnostics, and explicit unsupported states for system proxy, tray, and autostart until OS-specific signed integrations are added.
