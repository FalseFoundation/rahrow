---
id: 73122e
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
  - "844182"
parent: 9395f1
directories:
  - packages/engine
  - engines
projects:
  - rahrow-engine
---

Harden Xray config and process management. Acceptance: config generation is deterministic and snapshot-tested for supported protocol combinations; process start/stop/restart handles crashes, stale processes, bad binary paths, invalid configs, log capture, and timeout cleanup.
