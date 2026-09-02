---
id: TS-01M0R1KF1NAB1QXBE76RXT7HQW
title: Complete VLESS, VMess, and Trojan URL round-trips
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:29 UTC
updatedAt: 2026-08-23 20:10 UTC
labels:
  - prod-v2
  - protocol
  - p0-blocker
dependsOn:
  - TS-01M0R1KADP3EEVXN71G0S548CG
parent: TS-01M0R1J88162KKWAMHX36EBWP1
directories:
  - packages/core
projects:
  - rahrow-core
---

Finish parse/serialize for VLESS, VMess, and Trojan through the protocol registry.

Cover TCP, WS, gRPC, HTTPUpgrade, TLS, REALITY, invalid UUID/base64/JSON/ports, unknown query params, and round-trip stability.

Acceptance: tests are executable specifications; parsers fail closed; serializers do not emit Xray JSON.
