---
id: TS-01M0QTPNNCCJ5FGVMNZ1C556F9
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
  - TS-01M0QTPF662C3D9885ESQV0RSB
parent: TS-01M0QTNQ6P1VF8S21D8EVXRJ1T
directories:
  - packages/core
projects:
  - rahrow-core
---

Expand executable protocol specifications. Acceptance: VLESS, VMess, and Trojan parse/serialize tests cover TLS, REALITY where supported, WebSocket, TCP, gRPC where supported by the current model, missing fields, invalid UUID/base64/JSON, invalid ports, unknown query params, and round-trip behavior.
