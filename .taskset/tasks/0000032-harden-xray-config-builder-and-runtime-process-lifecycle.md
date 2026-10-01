---
id: 0000032-harden-xray-config-builder-and-runtime-process-lifecycle
title: Harden Xray config builder and runtime process lifecycle
status: done
priority: high
risk: high
createdAt: 2026-08-23 17:29 UTC
updatedAt: 2026-08-23 18:49 UTC
labels:
  - prod-grade
  - engine
  - xray-runtime
  - security
  - p0-release-blocker
dependsOn:
  - 0000031-finalize-proxyengine-contract-and-future-engine-seam
parent: 0000025-make-rahrow-production-grade
directories:
  - packages/engine
  - engines
projects:
  - rahrow-engine
---

Harden Xray config and process management. Acceptance: config generation is deterministic and snapshot-tested for supported protocol combinations; process start/stop/restart handles crashes, stale processes, bad binary paths, invalid configs, log capture, and timeout cleanup.
