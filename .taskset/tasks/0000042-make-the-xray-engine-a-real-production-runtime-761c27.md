---
id: 761c27
title: Make the Xray engine a real production runtime
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:29 UTC
updatedAt: 2026-08-23 20:35 UTC
labels:
  - prod-v2
  - engine
  - xray
  - p0-blocker
dependsOn:
  - 944fdd
related:
  - 73122e
  - "844182"
parent: 713ce0
directories:
  - packages/engine
  - engines
projects:
  - rahrow-engine
---

Epic: XrayEngine must generate complete configs and run a real process, not NoopXrayProcess / NoopXrayLatencyProbe.

Acceptance: DNS, routing, sniffing, mux, and stream settings are generated from ConnectionProfile; process start/stop/restart/crash is owned by packages/engine plus platform process adapters; future engines can still implement ProxyEngine without UI changes.
