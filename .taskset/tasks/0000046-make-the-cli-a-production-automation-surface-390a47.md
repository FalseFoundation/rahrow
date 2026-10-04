---
id: 390a47
title: Make the CLI a production automation surface
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:29 UTC
updatedAt: 2026-08-23 22:10 UTC
labels:
  - prod-v2
  - cli
  - p1-product
dependsOn:
  - 761c27
  - 928ff0
related:
  - 48bac7
parent: 713ce0
directories:
  - apps/cli
  - packages/core
  - packages/engine
projects:
  - rahrow-cli
---

Epic: CLI must use the real Xray process adapter, durable storage, and subscription URL fetch.

Acceptance: profiles, import, export, subscription, connect, disconnect, status, and test work against shared core/engine; JSON on stdout; errors on stderr; documented exit codes.
