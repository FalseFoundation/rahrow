---
id: 7686ad
title: Lock Connections cleanup drawer during active work
status: done
priority: high
risk: medium
createdAt: 2026-09-01 12:13 UTC
updatedAt: 2026-09-01 12:17 UTC
labels:
  - connections
  - cleanup
  - accessibility
related:
  - 014c80
files:
  - packages/features/src/profiles/ConnectionCleanupDrawer.tsx
  - packages/features/src/profiles/useConnectionCleanup.ts
directories:
  - packages/features/src/profiles
projects:
  - rahrow-uiux
---

Prevent every drawer dismissal path while cleanup is scanning or committing. Keep the explicit cancel action available during scanning, then allow dismissal after cancellation or completion. Cover hook state and drawer interaction behavior with tests.
