---
id: 0000008-implement-cli-commands-over-shared-core-capabilities
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
  - 0000003-implement-import-pipeline-and-subscription-parsing
  - 0000005-implement-local-profile-and-settings-persistence
  - 0000004-implement-shared-connection-lifecycle-orchestration
directories:
  - apps
projects:
  - rahrow
---

Create a Node.js TypeScript CLI that consumes shared core/import/storage/engine capabilities for profiles, import/export, connect/disconnect, status, test, and subscription commands without duplicating protocol logic.
