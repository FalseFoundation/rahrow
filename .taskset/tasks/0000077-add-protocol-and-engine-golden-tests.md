---
id: 0000077-add-protocol-and-engine-golden-tests
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
  - 0000040-complete-core-domain-protocols-and-settings
  - 0000042-make-the-xray-engine-a-real-production-runtime
parent: 0000047-prove-production-behavior-with-automated-tests
directories:
  - packages/core
  - packages/engine
projects:
  - rahrow-testing
---

Golden tests for share links and Xray config snapshots. Include malformed and hostile input.

Acceptance: CI runs them without a live network.
