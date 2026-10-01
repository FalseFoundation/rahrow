---
id: 0000049-expand-connectionprofile-for-production-protocol-fields
title: Expand ConnectionProfile for production protocol fields
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:29 UTC
updatedAt: 2026-08-23 20:08 UTC
labels:
  - prod-v2
  - core
  - protocol
  - p0-blocker
parent: 0000040-complete-core-domain-protocols-and-settings
directories:
  - packages/core
projects:
  - rahrow-core
---

Add the profile fields needed by real VLESS/VMess/Trojan share links without modeling every Xray JSON key.

Include ALPN, allowInsecure, REALITY spiderX, mux, packetEncoding, encryption, header type, and transport variants the UI/engine need. Keep unknown engine details out of the domain.

Acceptance: Zod schemas reject hostile/malformed data; tests cover missing and extra fields.
