---
id: 0000003-implement-import-pipeline-and-subscription-parsing
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
  - 0000001-implement-protocol-url-parsing-and-serialization
directories:
  - packages/core
projects:
  - rahrow
---

Build the Input -> Decode -> Detect -> Parse -> Normalize -> Validate pipeline. Add subscription decode/parse behavior that reuses the protocol registry and treats persisted/network input as untrusted.
