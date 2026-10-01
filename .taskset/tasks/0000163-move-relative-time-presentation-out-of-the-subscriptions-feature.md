---
id: 0000163-move-relative-time-presentation-out-of-the-subscriptions-feature
title: Move relative-time presentation out of the subscriptions feature
status: done
priority: medium
risk: low
createdAt: 2026-08-31 00:50 UTC
updatedAt: 2026-08-31 02:53 UTC
labels:
  - architecture-audit
  - utilities
  - features
  - time
  - ownership
parent: 0000143-run-exhaustive-impeccable-ui-and-ux-hardening-program
files:
  - packages/features/src/subscriptions/relative-time.ts
  - packages/features/src/profiles/ProfileManagement.tsx
directories:
  - packages/features/src/app
  - packages/features/src/subscriptions
  - packages/features/src/profiles
projects:
  - rahrow
---

## Context
`formatRelativeTime` is imported by both subscriptions and profiles but is owned by the subscriptions feature, creating a sibling-private dependency.

## Scope
- Move the formatter and tests to a shared frontend presentation owner under `packages/features/src/app` (or another explicitly named shared presentation module).
- Update exact-file imports from subscriptions and profiles.
- Preserve deterministic `now` injection and invalid-date behavior.
- Do not create a generic `utils.ts` or a new package for this single UI-copy helper.

## Acceptance criteria
- Profiles no longer import from subscriptions for relative-time formatting.
- The new filename reveals the time/presentation purpose.
- Tests cover past, near-present, future, day-scale, and invalid values.
- No barrel or compatibility re-export remains at the old path.

## Verification
Run formatter and consuming component tests, feature typecheck, and `git diff --check`.
