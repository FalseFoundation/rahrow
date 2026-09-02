---
id: TS-01M1281R55BT51R6QHQWSSNVDR
title: Prove baseline V2Ray protocol and security conformance
status: blocked
priority: urgent
risk: high
createdAt: 2026-08-27 18:34 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - protocol
  - security
  - p0-release-blocker
dependsOn:
  - TS-01M11NT06C3NAK1A9B53E7A2QZ
parent: TS-01M11M0JVKQNTKAKPHQXM5M88A
directories:
  - packages/core
  - packages/engine
  - packages/features
projects:
  - rahrow-release
  - rahrow-phase-06-verification-and-release-gates
---

Canonical VMess, VLESS, Trojan, TLS, REALITY, Vision, uTLS, WebSocket, gRPC, TCP, HTTP Upgrade, dual-engine compiler, malformed-input, and incompatibility tests are green. Final conformance must run against the exact engines embedded in each RahRow application artifact, not host-installed binaries or development PATH overrides, and must cover TCP/UDP, IPv4/IPv6, DNS, reconnect, and rollback. This remains blocked on pinned embedded runtime artifacts and installed-artifact evidence.
