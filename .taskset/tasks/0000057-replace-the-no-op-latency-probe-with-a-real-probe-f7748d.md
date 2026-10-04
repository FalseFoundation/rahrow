---
id: f7748d
title: Replace the no-op latency probe with a real probe
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:30 UTC
updatedAt: 2026-08-23 20:16 UTC
labels:
  - prod-v2
  - engine
  - p0-blocker
dependsOn:
  - e46903
parent: 761c27
directories:
  - packages/engine
projects:
  - rahrow-engine
---

Implement latency/reachability through the local inbound or an injected probe. Do not call it speedtest.

Acceptance: test(profile) returns reachable, latencyMs, checkedAt, and error; CLI/desktop/mobile share the engine method.
