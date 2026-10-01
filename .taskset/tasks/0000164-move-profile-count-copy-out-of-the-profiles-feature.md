---
id: 0000164-move-profile-count-copy-out-of-the-profiles-feature
title: Move profile-count copy out of the profiles feature
status: done
priority: medium
risk: low
createdAt: 2026-08-31 00:50 UTC
updatedAt: 2026-08-31 02:53 UTC
labels:
  - architecture-audit
  - utilities
  - features
  - profiles
  - ownership
parent: 0000143-run-exhaustive-impeccable-ui-and-ux-hardening-program
files:
  - packages/features/src/profiles/profile-management-model.ts
  - packages/features/src/import/useImport.ts
directories:
  - packages/features/src/app
  - packages/features/src/profiles
  - packages/features/src/import
projects:
  - rahrow
---

## Context
`formatProfileCount` is owned by the profiles feature model but imported by the import feature for user-facing result copy.

## Scope
- Move the count-label rule to a clearly named shared frontend presentation model.
- Update profile and import consumers through exact-file imports.
- Keep profile-specific latency and capability logic in the profiles model.
- Avoid a generic `utils` dumping ground or premature package.

## Acceptance criteria
- Import no longer depends on a profiles-private model.
- Singular/plural and zero-count behavior are directly tested.
- User-visible copy remains consistent across import and profile workflows.
- No compatibility re-export remains at the old location.

## Verification
Run import/profile model and hook tests, feature typecheck, and `git diff --check`.
