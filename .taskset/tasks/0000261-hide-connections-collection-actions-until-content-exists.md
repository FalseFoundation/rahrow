---
id: 0000261-hide-connections-collection-actions-until-content-exists
title: Hide Connections collection actions until content exists
status: done
priority: medium
risk: low
createdAt: 2026-09-02 03:49 UTC
updatedAt: 2026-09-02 16:49 UTC
labels:
  - connections
  - empty-state
  - action-visibility
  - ui
parent: 0000143-run-exhaustive-impeccable-ui-and-ux-hardening-program
directories:
  - packages/features/src/profiles
  - packages/features/src/subscriptions
projects:
  - rahrow-uiux
  - rahrow-phase-02-light-ui-and-copy
---

Keep Add Connection visible in the Connections empty state, but render collection-level action buttons only when at least one connection/profile or subscription exists and the action has a valid target. Derive visibility from canonical rendered ownership rather than stale local counts. Avoid layout jumps during initial loading and background refresh.

Acceptance covers empty, loading, error, filtered-empty, standalone-only, subscription-only, imported, deleted-last-item, locked, and mobile/desktop layouts.
