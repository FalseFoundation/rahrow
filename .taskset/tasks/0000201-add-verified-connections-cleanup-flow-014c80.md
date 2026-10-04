---
id: 014c80
title: Add verified Connections cleanup flow
status: done
priority: high
risk: high
createdAt: 2026-09-01 11:36 UTC
updatedAt: 2026-09-01 12:11 UTC
labels:
  - connections
  - cleanup
  - tanstack-pacer
  - accessibility
related:
  - dab520
files:
  - packages/features/src/profiles/ProfileManagement.tsx
directories:
  - packages/features/src/profiles
  - packages/features/src/subscriptions
  - packages/ui/src/components
projects:
  - rahrow-uiux
---

Probe every saved connection and subscription source with bounded, cancellable work. Present results before deletion, require explicit irreversible confirmation, remove only failed or timed-out entries, preserve locked subscriptions, and verify shared desktop/mobile UI, accessibility, Virtual behavior, Pacer scheduling, tests, and energy use.
