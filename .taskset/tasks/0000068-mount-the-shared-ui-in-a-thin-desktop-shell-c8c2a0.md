---
id: c8c2a0
title: Mount the shared UI in a thin desktop shell
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:32 UTC
updatedAt: 2026-08-23 22:21 UTC
labels:
  - prod-v2
  - desktop
  - visual-parity
  - p0-blocker
dependsOn:
  - a27174
parent: a3426e
directories:
  - apps/desktop
  - packages/features
projects:
  - rahrow-desktop
---

apps/desktop must mount packages/features, inject Tauri capabilities, and keep no product layout of its own.

Acceptance: deleting app-local screens does not remove product UI; desktop looks like mobile.
