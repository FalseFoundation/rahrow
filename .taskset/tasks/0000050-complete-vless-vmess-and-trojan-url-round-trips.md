---
id: 0000050-complete-vless-vmess-and-trojan-url-round-trips
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
  - 0000049-expand-connectionprofile-for-production-protocol-fields
parent: 0000040-complete-core-domain-protocols-and-settings
directories:
  - packages/core
projects:
  - rahrow-core
---

Finish parse/serialize for VLESS, VMess, and Trojan through the protocol registry.

Cover TCP, WS, gRPC, HTTPUpgrade, TLS, REALITY, invalid UUID/base64/JSON/ports, unknown query params, and round-trip stability.

Acceptance: tests are executable specifications; parsers fail closed; serializers do not emit Xray JSON.
