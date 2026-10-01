---
id: 0000070-bundle-the-xray-sidecar-for-desktop-builds
title: Bundle the Xray sidecar for desktop builds
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:32 UTC
updatedAt: 2026-08-23 21:52 UTC
labels:
  - prod-v2
  - desktop
  - xray
  - p0-blocker
dependsOn:
  - 0000059-pin-verify-and-resolve-xray-runtime-binaries
parent: 0000044-ship-a-production-desktop-client-around-the-shared-ui
directories:
  - apps/desktop
  - engines
projects:
  - rahrow-desktop
---

Production desktop builds must ship or resolve a pinned Xray sidecar rather than hoping PATH contains xray.

Acceptance: docs match behavior; missing binary is a typed diagnostic; unsigned builds can still run with RAHROW_XRAY_BINARY.
