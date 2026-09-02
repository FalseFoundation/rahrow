---
id: TS-01M0R1MDCEW3CHEGKEHTX4QC00
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
  - TS-01M0R1MB3AEDK56RHJNYYZWQNE
parent: TS-01M0R1JHED81QWBMSMG5X42E2S
directories:
  - packages/engine
projects:
  - rahrow-engine
---

Implement latency/reachability through the local inbound or an injected probe. Do not call it speedtest.

Acceptance: test(profile) returns reachable, latencyMs, checkedAt, and error; CLI/desktop/mobile share the engine method.
