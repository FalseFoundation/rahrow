---
id: TS-01M0K4Q9JK7MQFS53BBBWHYMVX
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
  - TS-01M0K4PWG7S684JXP80ZJBJZ99
directories:
  - packages/core
projects:
  - rahrow
---

Build the Input -> Decode -> Detect -> Parse -> Normalize -> Validate pipeline. Add subscription decode/parse behavior that reuses the protocol registry and treats persisted/network input as untrusted.
