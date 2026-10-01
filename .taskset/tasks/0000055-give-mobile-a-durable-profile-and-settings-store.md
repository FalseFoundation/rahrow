---
id: 0000055-give-mobile-a-durable-profile-and-settings-store
title: Give mobile a durable profile and settings store
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:30 UTC
updatedAt: 2026-08-23 22:09 UTC
labels:
  - prod-v2
  - storage
  - mobile
  - p0-blocker
parent: 0000041-replace-in-memory-app-stores-with-durable-persistence
directories:
  - apps/mobile
  - packages/core
projects:
  - rahrow-core
  - rahrow-mobile
---

Replace MemoryDocumentStore in apps/mobile with Capacitor Preferences/Filesystem storage behind the core store contracts.

Acceptance: restart preserves data; web fallback is explicit; Zod validation on read.
