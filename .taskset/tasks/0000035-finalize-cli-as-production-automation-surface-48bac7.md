---
id: 48bac7
title: Finalize CLI as production automation surface
status: done
priority: medium
risk: medium
createdAt: 2026-08-23 17:30 UTC
updatedAt: 2026-08-23 18:50 UTC
labels:
  - prod-grade
  - cli
  - automation
  - p1-hardening
dependsOn:
  - 6fa2c2
  - 9d6390
  - 73122e
parent: 9395f1
directories:
  - apps/cli
  - packages/core
  - packages/engine
projects:
  - rahrow-interfaces
---

Finalize the CLI as the production automation and smoke-test surface. Acceptance: profiles, import, export, subscription, connect, disconnect, status, and test return stable exit codes, machine-readable JSON where appropriate, and clear stderr messages.
