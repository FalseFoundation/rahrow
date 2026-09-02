---
id: TS-01M0R1QYEXQ0KGYPW9HCHMWJ53
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
  - TS-01M0R1QA69V1BCR1QSQ896WFDM
parent: TS-01M0R1JWTN9Y1BGD7D1ENK041D
directories:
  - apps/desktop
  - engines
projects:
  - rahrow-desktop
---

Production desktop builds must ship or resolve a pinned Xray sidecar rather than hoping PATH contains xray.

Acceptance: docs match behavior; missing binary is a typed diagnostic; unsigned builds can still run with RAHROW_XRAY_BINARY.
