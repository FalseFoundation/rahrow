---
id: 0000033-implement-production-desktop-native-integrations
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
  - 0000032-harden-xray-config-builder-and-runtime-process-lifecycle
parent: 0000025-make-rahrow-production-grade
directories:
  - apps/desktop
  - packages/engine
projects:
  - rahrow-interfaces
---

Implement production desktop native integrations. Acceptance: Tauri commands bridge only native/process capabilities; desktop supports Xray sidecar start/stop/status through a host-provided binary, explicit diagnostics, and explicit unsupported states for system proxy, tray, and autostart until OS-specific signed integrations are added.
