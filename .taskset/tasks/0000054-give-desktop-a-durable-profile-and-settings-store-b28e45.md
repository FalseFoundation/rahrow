---
id: b28e45
title: Give desktop a durable profile and settings store
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:30 UTC
updatedAt: 2026-08-23 22:09 UTC
labels:
  - prod-v2
  - storage
  - desktop
  - p0-blocker
parent: 928ff0
directories:
  - apps/desktop
  - packages/core
projects:
  - rahrow-core
  - rahrow-desktop
---

Replace MemoryDocumentStore in apps/desktop with a Tauri FS or app-data document store that implements the core store contracts.

Acceptance: restart preserves profiles/settings; invalid files fail closed; tests cover the adapter.
