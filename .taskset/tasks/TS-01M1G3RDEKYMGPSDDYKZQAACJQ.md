---
id: TS-01M1G3RDEKYMGPSDDYKZQAACJQ
title: Turn Backup export into a category-first multistep flow
status: todo
priority: high
risk: high
createdAt: 2026-09-02 03:49 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - backup-restore
  - drawer
  - multistep-form
  - security
  - settings
related:
  - TS-01M1FJ0P69C726J6PAZV26M3DZ
  - TS-01M1FJ04ED4D9428EWJ2KA0NR8
parent: TS-01M1FHYT7403GRGB8AEVAGCA5S
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
