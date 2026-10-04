---
id: 1813d4
title: Implement CLI commands over shared core capabilities
status: done
priority: medium
risk: medium
createdAt: 2026-08-21 21:48 UTC
updatedAt: 2026-08-22 02:10 UTC
labels:
  - phase-10
  - cli
dependsOn:
  - 6d1387
  - "0618e9"
  - 1ae453
directories:
  - apps
projects:
  - rahrow
---

Create a Node.js TypeScript CLI that consumes shared core/import/storage/engine capabilities for profiles, import/export, connect/disconnect, status, test, and subscription commands without duplicating protocol logic.
