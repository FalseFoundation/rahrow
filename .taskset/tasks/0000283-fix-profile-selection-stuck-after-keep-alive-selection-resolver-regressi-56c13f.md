---
id: 56c13f
title: Fix profile selection stuck after keep-alive / selection resolver regression
status: done
priority: urgent
owner: junkieshuffle
assignees:
  - junkieshuffle
createdAt: 2026-10-05 20:01 UTC
updatedAt: 2026-10-05 20:02 UTC
labels:
  - bug
  - frontend
  - connection
related:
  - dee160
  - 2f9bfe
files:
  - packages/features/src/home/useHome.ts
  - packages/features/src/home/home-model.ts
  - packages/features/src/profiles/useProfileManagement.ts
---

## Problem
After tab keep-alive + selection resolver, picking another profile kept the previous selection (Home stayed stale; Connections reload could also prefer old settings).

## Fix
- Home re-syncs from settings when its primary tab becomes visible
- Idle selection prefers persisted `activeProfileId` over a stale Home id
- Connections reload prefers current in-memory selection over older persisted id
- Home `selectProfile` persists `activeProfileId`

## Acceptance
- [x] Selecting a profile on Connections updates Home after return
- [x] Regression tests for idle preference + visibility sync
- [x] Build installed on device
