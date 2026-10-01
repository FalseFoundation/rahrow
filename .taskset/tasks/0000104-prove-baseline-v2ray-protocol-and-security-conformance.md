---
id: 0000104-prove-baseline-v2ray-protocol-and-security-conformance
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
  - 0000091-build-pinned-native-xray-and-sing-box-runtimes-for-android-and-apple
parent: 0000090-bundle-selectable-proxy-engines-and-define-the-protocol-roadmap
directories:
  - packages/core
  - packages/engine
  - packages/features
projects:
  - rahrow-release
  - rahrow-phase-06-verification-and-release-gates
---

Canonical VMess, VLESS, Trojan, TLS, REALITY, Vision, uTLS, WebSocket, gRPC, TCP, HTTP Upgrade, dual-engine compiler, malformed-input, and incompatibility tests are green. Final conformance must run against the exact engines embedded in each RahRow application artifact, not host-installed binaries or development PATH overrides, and must cover TCP/UDP, IPv4/IPv6, DNS, reconnect, and rollback. This remains blocked on pinned embedded runtime artifacts and installed-artifact evidence.
