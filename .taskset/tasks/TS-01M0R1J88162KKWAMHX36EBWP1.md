---
id: TS-01M0R1J88162KKWAMHX36EBWP1
title: Complete core domain, protocols, and settings
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:29 UTC
updatedAt: 2026-08-23 20:13 UTC
labels:
  - prod-v2
  - core
  - protocol
  - p0-blocker
related:
  - TS-01M0QTPF662C3D9885ESQV0RSB
  - TS-01M0QTPNNCCJ5FGVMNZ1C556F9
parent: TS-01M0R1ANJXZV14BYG8SPA1T90P
directories:
  - packages/core
projects:
  - rahrow-core
---

Epic: make packages/core production-complete for a real V2Ray/Xray client.

Scope: ConnectionProfile fields needed by common share links, VLESS/VMess/Trojan parse/serialize, subscription fetch/refresh, connection observers/reconnect, and a settings model that can drive UI and runtimes.

Do not leak Xray JSON, React, Tauri, or Capacitor into core.
Acceptance: CLI, desktop, and mobile can share one profile/subscription/connection model without app-local protocol logic.
