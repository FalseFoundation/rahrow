---
id: a20f15
title: Complete protocol compatibility matrix
status: done
priority: high
risk: high
createdAt: 2026-08-23 17:29 UTC
updatedAt: 2026-08-23 18:35 UTC
labels:
  - prod-grade
  - protocols
  - security
  - testing
  - p0-release-blocker
dependsOn:
  - 8e4a87
parent: 9395f1
directories:
  - packages/core
projects:
  - rahrow-core
---

Expand executable protocol specifications. Acceptance: VLESS, VMess, and Trojan parse/serialize tests cover TLS, REALITY where supported, WebSocket, TCP, gRPC where supported by the current model, missing fields, invalid UUID/base64/JSON, invalid ports, unknown query params, and round-trip behavior.
