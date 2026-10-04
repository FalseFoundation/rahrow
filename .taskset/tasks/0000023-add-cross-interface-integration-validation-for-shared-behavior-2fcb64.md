---
id: 2fcb64
title: Add cross-interface integration validation for shared behavior
status: done
priority: medium
risk: high
createdAt: 2026-08-21 23:32 UTC
updatedAt: 2026-08-22 02:23 UTC
labels:
  - validation
  - tests
  - integration
dependsOn:
  - ae97ba
  - a0da13
  - 1813d4
  - e3eed6
directories:
  - apps
  - packages
projects:
  - rahrow
---

Add focused integration validation proving desktop, mobile, and CLI consume the same core contracts for profiles, imports, storage, lifecycle, and latency semantics. Cover malformed persisted data, malformed protocol/subscription input, app/runtime unavailable paths, and command/UI boundary behavior without duplicating implementation-detail unit tests.
