---
id: 0000042-make-the-xray-engine-a-real-production-runtime
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
  - 0000040-complete-core-domain-protocols-and-settings
related:
  - 0000032-harden-xray-config-builder-and-runtime-process-lifecycle
  - 0000031-finalize-proxyengine-contract-and-future-engine-seam
parent: 0000039-ship-rahrow-as-a-production-v2ray-xray-client
directories:
  - packages/engine
  - engines
projects:
  - rahrow-engine
---

Epic: XrayEngine must generate complete configs and run a real process, not NoopXrayProcess / NoopXrayLatencyProbe.

Acceptance: DNS, routing, sniffing, mux, and stream settings are generated from ConnectionProfile; process start/stop/restart/crash is owned by packages/engine plus platform process adapters; future engines can still implement ProxyEngine without UI changes.
