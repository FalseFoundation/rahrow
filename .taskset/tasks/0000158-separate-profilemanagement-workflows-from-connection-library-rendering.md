---
id: 0000158-separate-profilemanagement-workflows-from-connection-library-rendering
title: Separate ProfileManagement workflows from connection-library rendering
status: done
priority: high
risk: high
createdAt: 2026-08-31 00:50 UTC
updatedAt: 2026-08-31 03:54 UTC
labels:
  - architecture-audit
  - features
  - profiles
  - subscriptions
  - fba
parent: 0000151-decompose-the-connection-library-without-behavior-drift
files:
  - packages/features/src/profiles/ProfileManagement.tsx
  - packages/features/src/profiles/useProfileManagement.ts
directories:
  - packages/features/src/profiles
  - packages/features/src/subscriptions
  - packages/features/src/import
  - packages/features/src/share
projects:
  - rahrow
---

## Context
`ProfileManagement.tsx` is over 1,100 lines and owns search, sorting, ownership partitioning, refresh queues, subscription actions, drawers, import/share behavior, and rendering.

## Scope
- Characterize current behavior with focused tests before moving code.
- Extract collection selection, search/sort derivation, subscription grouping, refresh orchestration, drawer state, and action-target rules into named hooks/models.
- Split group, virtualized list, row, action drawer, sort drawer, and subscription editor into feature-owned components.
- Move cross-feature orchestration upward or pass explicit public capabilities; do not import sibling private internals.
- Preserve TanStack Virtual/Pacer behavior, standalone-versus-subscription ownership, pull-to-refresh, accessibility, and identical desktop/mobile UI.

## Acceptance criteria
- The final screen component primarily composes UI and wires prepared handlers/state.
- No persistence, engine testing, subscription refresh queue, protocol serialization, or platform call is implemented inline in the screen.
- Feature models own pure search/sort/group/status transformations and have tests.
- Extracted components have matching CSS Modules where they own layout.
- Existing visible behavior, keyboard semantics, virtual scrolling, and aggregate ownership do not drift.

## Verification
Run profile model/hook/component tests, feature typecheck/test, cross-interface tests, and `git diff --check`.
