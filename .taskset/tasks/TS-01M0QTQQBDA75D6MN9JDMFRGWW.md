---
id: TS-01M0QTQQBDA75D6MN9JDMFRGWW
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
  - TS-01M0QTQF1M5EGGJ05R91X68RPY
parent: TS-01M0QTNQ6P1VF8S21D8EVXRJ1T
directories:
  - apps/desktop
  - packages/engine
projects:
  - rahrow-interfaces
---

Implement production desktop native integrations. Acceptance: Tauri commands bridge only native/process capabilities; desktop supports Xray sidecar start/stop/status through a host-provided binary, explicit diagnostics, and explicit unsupported states for system proxy, tray, and autostart until OS-specific signed integrations are added.
