---
id: TS-01M1AP3VN60C27N0MCTPHZV3TB
title: Persist Connections disclosure and view state
status: done
priority: high
risk: medium
createdAt: 2026-08-31 01:14 UTC
updatedAt: 2026-08-31 03:36 UTC
labels:
  - connections
  - state
  - persistence
  - ui
related:
  - TS-01M19V6CEEDGEBSWP4CMPHACBH
  - TS-01M1AB3KH64G3YWP3WDZJZ2T2Q
parent: TS-01M1AM68XJ5G8CNBTBZ84C12EM
files:
  - packages/features/src/profiles/ProfileManagement.tsx
  - packages/features/src/profiles/useProfileManagement.ts
  - packages/core/src/storage/json-store.ts
directories:
  - packages/features/src/profiles
  - packages/features/src/app
  - packages/core/src/storage
projects:
  - rahrow-uiux
---

## Purpose

Preserve user-controlled view state on the Connections screen so leaving and returning to the route does not reset every collection. Start with standalone and subscription group disclosure state, and establish a small policy for other view preferences that should survive a remount.

## Implementation contract

- Replace uncontrolled defaultOpen groups with controlled disclosure state keyed by stable aggregate identity: one key for standalone connections and one per subscription id.
- Restore state before the list becomes interactive to avoid an open-then-collapse flash.
- Preserve state across route changes, screen remounts, desktop/mobile restarts, refreshes, sorting, filtering, and subscription refreshes.
- New groups default open. Removed subscription keys are pruned so persisted state cannot grow without bound.
- Keep ephemeral state ephemeral: active drawers, destructive confirmations, loading flags, pull distance, search focus, and pending commands must not be restored after restart.
- Own reusable behavior in a hook or feature model. ProfileManagement remains a rendering/composition component.
- Use the existing validated local document/settings boundary; do not access localStorage directly from shared feature components and do not add a second persistence system.
- Keep the persisted shape versioned and safely migrate or default malformed/older data.

## Acceptance criteria

- Collapsing a connection group, navigating away, and returning preserves the choice.
- Restarting both desktop and mobile preserves valid disclosure state.
- Deleted subscriptions leave no orphaned preference entries; new subscriptions start open.
- Independent groups do not overwrite one another.
- Corrupt or unavailable persistence falls back to defaults without making Connections unusable and reports a bounded diagnostic.
- Focus order, aria-expanded, keyboard activation, and reduced-motion behavior remain correct.
- Add focused model/store tests plus shared UI tests for remount, restart, pruning, malformed data, and desktop/mobile runtime parity.
