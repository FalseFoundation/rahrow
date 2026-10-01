---
id: 0000057-replace-the-no-op-latency-probe-with-a-real-probe
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
  - 0000056-generate-complete-xray-configs-from-connectionprofile
parent: 0000042-make-the-xray-engine-a-real-production-runtime
directories:
  - packages/engine
projects:
  - rahrow-engine
---

Implement latency/reachability through the local inbound or an injected probe. Do not call it speedtest.

Acceptance: test(profile) returns reachable, latencyMs, checkedAt, and error; CLI/desktop/mobile share the engine method.
