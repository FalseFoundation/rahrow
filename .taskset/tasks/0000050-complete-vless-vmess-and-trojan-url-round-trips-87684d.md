---
id: 87684d
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
  - b75aff
parent: 944fdd
directories:
  - packages/core
projects:
  - rahrow-core
---

Finish parse/serialize for VLESS, VMess, and Trojan through the protocol registry.

Cover TCP, WS, gRPC, HTTPUpgrade, TLS, REALITY, invalid UUID/base64/JSON/ports, unknown query params, and round-trip stability.

Acceptance: tests are executable specifications; parsers fail closed; serializers do not emit Xray JSON.
