---
id: TS-01M0R1MB3AEDK56RHJNYYZWQNE
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
  - TS-01M0R1J88162KKWAMHX36EBWP1
parent: TS-01M0R1JHED81QWBMSMG5X42E2S
directories:
  - packages/engine
projects:
  - rahrow-engine
---

XrayConfigBuilder must emit DNS, routing, sniffing, mux, sockopt, freedom/blackhole, and full stream settings from the shared profile.

Do not expose Xray JSON to UI.

Acceptance: snapshot tests for supported protocol/transport/security combinations; unsupported fields fail with typed errors.
