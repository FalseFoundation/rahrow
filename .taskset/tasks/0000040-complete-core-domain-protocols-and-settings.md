---
id: 0000040-complete-core-domain-protocols-and-settings
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
  - 0000027-harden-core-domain-and-profile-validation
  - 0000028-complete-protocol-compatibility-matrix
parent: 0000039-ship-rahrow-as-a-production-v2ray-xray-client
directories:
  - packages/core
projects:
  - rahrow-core
---

Epic: make packages/core production-complete for a real V2Ray/Xray client.

Scope: ConnectionProfile fields needed by common share links, VLESS/VMess/Trojan parse/serialize, subscription fetch/refresh, connection observers/reconnect, and a settings model that can drive UI and runtimes.

Do not leak Xray JSON, React, Tauri, or Capacitor into core.
Acceptance: CLI, desktop, and mobile can share one profile/subscription/connection model without app-local protocol logic.
