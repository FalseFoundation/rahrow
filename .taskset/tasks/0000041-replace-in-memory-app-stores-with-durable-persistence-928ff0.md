---
id: 928ff0
title: Replace in-memory app stores with durable persistence
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:29 UTC
updatedAt: 2026-08-23 22:09 UTC
labels:
  - prod-v2
  - storage
  - p0-blocker
dependsOn:
  - 944fdd
related:
  - 9d6390
parent: 713ce0
directories:
  - packages/core
  - apps/desktop
  - apps/mobile
  - apps/cli
projects:
  - rahrow-core
---

Epic: profiles, subscriptions, and settings must survive app restart on every interface.

CLI already has a file document store. Desktop and mobile currently use MemoryDocumentStore.

Acceptance: Zod-validated durable stores; corrupt files fail closed; no silent data loss; same core store contracts on all apps.
