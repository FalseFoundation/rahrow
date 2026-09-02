---
id: TS-01M0QTQF1M5EGGJ05R91X68RPY
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
  - TS-01M0QTQ96WZG5EWKNA84RWWXWJ
parent: TS-01M0QTNQ6P1VF8S21D8EVXRJ1T
directories:
  - packages/engine
  - engines
projects:
  - rahrow-engine
---

Harden Xray config and process management. Acceptance: config generation is deterministic and snapshot-tested for supported protocol combinations; process start/stop/restart handles crashes, stale processes, bad binary paths, invalid configs, log capture, and timeout cleanup.
