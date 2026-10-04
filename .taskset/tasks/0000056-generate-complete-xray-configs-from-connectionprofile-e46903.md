---
id: e46903
title: Generate complete Xray configs from ConnectionProfile
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:30 UTC
updatedAt: 2026-08-23 20:14 UTC
labels:
  - prod-v2
  - engine
  - xray
  - p0-blocker
dependsOn:
  - 944fdd
parent: 761c27
directories:
  - packages/engine
projects:
  - rahrow-engine
---

XrayConfigBuilder must emit DNS, routing, sniffing, mux, sockopt, freedom/blackhole, and full stream settings from the shared profile.

Do not expose Xray JSON to UI.

Acceptance: snapshot tests for supported protocol/transport/security combinations; unsupported fields fail with typed errors.
