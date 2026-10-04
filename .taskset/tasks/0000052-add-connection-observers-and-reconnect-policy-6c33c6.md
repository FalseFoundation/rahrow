---
id: 6c33c6
title: Add connection observers and reconnect policy
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:29 UTC
updatedAt: 2026-08-23 20:12 UTC
labels:
  - prod-v2
  - core
  - p1-product
parent: 944fdd
directories:
  - packages/core
projects:
  - rahrow-core
---

ConnectionController must expose observable state and a small reconnect policy without putting state in UI components.

States: disconnected, connecting, connected, disconnecting, error.

Acceptance: UI/CLI can subscribe without polling internals; reconnect does not duplicate engine process logic.
