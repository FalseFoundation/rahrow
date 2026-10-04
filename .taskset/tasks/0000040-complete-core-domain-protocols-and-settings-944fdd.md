---
id: 944fdd
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
  - 8e4a87
  - a20f15
parent: 713ce0
directories:
  - packages/core
projects:
  - rahrow-core
---

Epic: make packages/core production-complete for a real V2Ray/Xray client.

Scope: ConnectionProfile fields needed by common share links, VLESS/VMess/Trojan parse/serialize, subscription fetch/refresh, connection observers/reconnect, and a settings model that can drive UI and runtimes.

Do not leak Xray JSON, React, Tauri, or Capacitor into core.
Acceptance: CLI, desktop, and mobile can share one profile/subscription/connection model without app-local protocol logic.
