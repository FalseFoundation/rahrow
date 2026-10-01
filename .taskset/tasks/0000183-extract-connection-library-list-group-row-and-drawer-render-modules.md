---
id: 0000183-extract-connection-library-list-group-row-and-drawer-render-modules
title: Extract connection-library list, group, row, and drawer render modules
status: done
priority: high
risk: medium
createdAt: 2026-08-31 01:22 UTC
updatedAt: 2026-08-31 03:54 UTC
labels:
  - ui
  - architecture
parent: 0000151-decompose-the-connection-library-without-behavior-drift
directories:
  - packages/features/src/profiles
projects:
  - rahrow-uiux
---

Continue the characterized ProfileManagement decomposition by extracting list/virtual row, ownership group, and action/sort drawer render modules. Preserve the public integration suite, outer app-scroll ownership, per-list virtualizer scroll containers and snapshots, action labels, locked/destructive behavior, all colors, and current imports outside packages/features/src/profiles.
