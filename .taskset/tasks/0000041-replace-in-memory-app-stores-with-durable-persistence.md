---
id: 0000041-replace-in-memory-app-stores-with-durable-persistence
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
  - 0000040-complete-core-domain-protocols-and-settings
related:
  - 0000030-make-storage-production-safe
parent: 0000039-ship-rahrow-as-a-production-v2ray-xray-client
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
