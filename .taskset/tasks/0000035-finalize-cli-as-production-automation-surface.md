---
id: 0000035-finalize-cli-as-production-automation-surface
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
  - 0000029-harden-import-export-and-subscription-pipelines
  - 0000030-make-storage-production-safe
  - 0000032-harden-xray-config-builder-and-runtime-process-lifecycle
parent: 0000025-make-rahrow-production-grade
directories:
  - apps/cli
  - packages/core
  - packages/engine
projects:
  - rahrow-interfaces
---

Finalize the CLI as the production automation and smoke-test surface. Acceptance: profiles, import, export, subscription, connect, disconnect, status, and test return stable exit codes, machine-readable JSON where appropriate, and clear stderr messages.
