---
id: TS-01M0R1RBW5YX9SE0GEN4XCDNNQ
title: Add protocol and engine golden tests
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:32 UTC
updatedAt: 2026-08-23 20:44 UTC
labels:
  - prod-v2
  - testing
  - protocol
  - engine
  - p0-blocker
dependsOn:
  - TS-01M0R1J88162KKWAMHX36EBWP1
  - TS-01M0R1JHED81QWBMSMG5X42E2S
parent: TS-01M0R1K550RG24K2062ZSJXCEF
directories:
  - packages/core
  - packages/engine
projects:
  - rahrow-testing
---

Golden tests for share links and Xray config snapshots. Include malformed and hostile input.

Acceptance: CI runs them without a live network.
