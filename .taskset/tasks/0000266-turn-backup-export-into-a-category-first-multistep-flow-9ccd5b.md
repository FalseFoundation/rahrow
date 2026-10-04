---
id: 9ccd5b
title: Turn Backup export into a category-first multistep flow
status: done
priority: high
risk: high
createdAt: 2026-09-02 03:49 UTC
updatedAt: 2026-09-02 16:49 UTC
labels:
  - backup-restore
  - drawer
  - multistep-form
  - security
  - settings
related:
  - "821e06"
  - ce193a
parent: bf02bf
directories:
  - packages/features/src/backup
  - packages/features/src/settings
  - packages/core/src/backup
  - apps/desktop
  - apps/mobile
  - apps/cli
projects:
  - rahrow-uiux
  - rahrow-interfaces
  - rahrow-phase-03-product-state-and-data
---

Replace per-subscription and per-connection export selection with exactly three category choices: Settings, Connections, or Both. Make export a clear multistep drawer: category first, then protection choice, then password and confirmation only when protected output is selected, then review/save. Back navigation preserves valid prior choices; cancellation and completion clear secrets.

Keep the versioned backup envelope, authenticated encryption, plaintext warning, import preview, atomic restore, native file capabilities, and CLI parity. Remove obsolete item-selection and indeterminate-state code, copy, tests, and schema assumptions without breaking older backup imports.
