---
id: b66068
title: Implement subscription fetch, decode, and refresh
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:29 UTC
updatedAt: 2026-08-23 20:11 UTC
labels:
  - prod-v2
  - core
  - p0-blocker
dependsOn:
  - 87684d
related:
  - 6fa2c2
parent: 944fdd
directories:
  - packages/core
projects:
  - rahrow-core
---

Subscriptions are data sources. Implement fetch via an injected fetcher, decode, parse through the protocol registry, normalize, validate, and report skipped entries.

Acceptance: no React/Tauri/Capacitor/Xray in this layer; one bad entry cannot fail the whole subscription; tests cover base64, mixed protocols, and garbage.
