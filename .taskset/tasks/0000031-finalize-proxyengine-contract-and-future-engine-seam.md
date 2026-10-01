---
id: 0000031-finalize-proxyengine-contract-and-future-engine-seam
title: Finalize ProxyEngine contract and future-engine seam
status: done
priority: high
risk: high
createdAt: 2026-08-23 17:29 UTC
updatedAt: 2026-08-23 18:45 UTC
labels:
  - prod-grade
  - engine
  - architecture
  - p0-release-blocker
dependsOn:
  - 0000026-audit-production-architecture-boundaries
  - 0000028-complete-protocol-compatibility-matrix
parent: 0000025-make-rahrow-production-grade
directories:
  - packages/core
  - packages/engine
  - apps/cli
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-engine
---

Lock the app-facing engine contract before runtime hardening. Acceptance: app and CLI code depend on ProxyEngine behavior, not Xray internals; engine errors, status, restart, latency, cancellation, and unsupported profiles are contract-tested.
