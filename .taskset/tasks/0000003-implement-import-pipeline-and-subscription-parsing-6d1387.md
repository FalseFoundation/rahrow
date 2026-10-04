---
id: 6d1387
title: Implement import pipeline and subscription parsing
status: done
priority: high
risk: high
createdAt: 2026-08-21 21:48 UTC
updatedAt: 2026-08-21 21:53 UTC
labels:
  - phase-5
  - import
  - subscriptions
dependsOn:
  - a5c869
directories:
  - packages/core
projects:
  - rahrow
---

Build the Input -> Decode -> Detect -> Parse -> Normalize -> Validate pipeline. Add subscription decode/parse behavior that reuses the protocol registry and treats persisted/network input as untrusted.
