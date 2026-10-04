---
id: bf4b7c
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
  - 944fdd
  - 761c27
parent: aab829
directories:
  - packages/core
  - packages/engine
projects:
  - rahrow-testing
---

Golden tests for share links and Xray config snapshots. Include malformed and hostile input.

Acceptance: CI runs them without a live network.
