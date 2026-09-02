---
id: TS-01M1G3RCS7R29XX23SB9FWSJ33
title: Repair macOS system-proxy mode end to end
status: todo
priority: urgent
risk: critical
createdAt: 2026-09-02 03:49 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - macos
  - system-proxy
  - native
  - connection-mode
  - p0-release-blocker
  - reported-regression
related:
  - TS-01M0R1R06PQMKFEHZQ51PTRWGH
  - TS-01M1FRYKD91BK92X7JEMRQMB3M
  - TS-01M1FDHAGZB5NBVT96PYFZ4999
parent: TS-01M1AP3WDCN9VWPAVCHXB76CS6
directories:
  - apps/desktop/src-tauri
  - apps/desktop/src
  - packages/engine
  - packages/core/src/connection
  - packages/features/src/home
projects:
  - rahrow-native-desktop
  - rahrow-cross-platform-hardening
  - rahrow-phase-04-native-runtime-and-capabilities
---

Reproduce the reported macOS System proxy failure on an installed app and trace the complete path: engine readiness and local endpoint, current network-service discovery, proxy state capture, authenticated OS application, verification, traffic routing, disconnect restoration, and crash recovery. Do not claim connected until both engine and macOS proxy state are effective.

Acceptance covers Ethernet and Wi-Fi, changing active service, PAC/manual proxy conflicts, privilege denial, missing endpoint, repeated connect/disconnect, engine or profile switch, app crash/relaunch, and exact restoration of prior HTTP/HTTPS/SOCKS/bypass settings. Record other platforms separately if the same defect is confirmed.
