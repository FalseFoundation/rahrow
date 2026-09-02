---
id: TS-01M0R1QA69V1BCR1QSQ896WFDM
title: Pin, verify, and resolve Xray runtime binaries
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:31 UTC
updatedAt: 2026-08-23 20:35 UTC
labels:
  - prod-v2
  - engine
  - xray
  - p0-blocker
parent: TS-01M0R1JHED81QWBMSMG5X42E2S
directories:
  - packages/engine
  - engines
projects:
  - rahrow-engine
---

Make engines/xray/runtime.json the source of truth for version/platform binaries. Resolve RAHROW_XRAY_BINARY, verify checksums, and fail clearly when missing.

Acceptance: desktop sidecar, CLI, and docs use the same manifest; no silent PATH guess in production builds.
