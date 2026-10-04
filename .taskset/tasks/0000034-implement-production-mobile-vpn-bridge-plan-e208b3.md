---
id: e208b3
title: Implement production mobile VPN bridge plan
status: done
priority: high
risk: high
createdAt: 2026-08-23 17:29 UTC
updatedAt: 2026-08-23 18:59 UTC
labels:
  - prod-grade
  - mobile
  - xray-runtime
  - p0-release-blocker
dependsOn:
  - 73122e
parent: 9395f1
directories:
  - apps/mobile
  - packages/engine
projects:
  - rahrow-interfaces
---

Implement production mobile VPN bridge plan. Acceptance: Capacitor API exposes connect, disconnect, status, and diagnostics; connect input can carry the Xray config to native code; TypeScript keeps only the plugin boundary; unsupported web/native entitlement states are explicit and test-covered until Android VPNService and iOS Network Extension implementations are added.
