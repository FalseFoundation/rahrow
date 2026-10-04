---
id: eb2fe8
title: Scaffold the RahRow CLI workspace and command framework
status: done
priority: medium
risk: medium
createdAt: 2026-08-21 23:31 UTC
updatedAt: 2026-08-22 02:02 UTC
labels:
  - phase-10
  - cli
  - workspace
dependsOn:
  - 6d1387
  - "0618e9"
parent: 1813d4
directories:
  - apps
projects:
  - rahrow
---

Create apps/cli as a private Node.js TypeScript workspace with minimal command routing for profiles, import, export, connect, disconnect, status, test, and subscription. Consume @rahrow/core and @rahrow/engine through package exports and declared workspace dependencies. Keep CLI output deterministic and script names aligned with Turbo without adding unnecessary aliases.
