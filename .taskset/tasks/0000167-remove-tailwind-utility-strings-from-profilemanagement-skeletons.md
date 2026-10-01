---
id: 0000167-remove-tailwind-utility-strings-from-profilemanagement-skeletons
title: Remove Tailwind utility strings from ProfileManagement skeletons
status: done
priority: low
risk: low
createdAt: 2026-08-31 00:50 UTC
updatedAt: 2026-08-31 04:22 UTC
labels:
  - architecture-audit
  - css-modules
  - cleanup
  - profiles
dependsOn:
  - 0000166-give-composed-feature-components-matching-css-modules
parent: 0000143-run-exhaustive-impeccable-ui-and-ux-hardening-program
files:
  - packages/features/src/profiles/ProfileManagement.tsx
  - packages/features/src/profiles/Profiles.module.css
directories:
  - packages/features/src/profiles
projects:
  - rahrow
---

## Context
ProfileManagement skeleton rows contain Tailwind utility strings for size, spacing, and radius, bypassing feature CSS Module ownership.

## Scope
- Replace the remaining literal utility classes with semantic CSS Module class names in the final extracted owning components.
- Reuse design tokens from `@rahrow/ui`; do not duplicate primitive internals.
- Add or retain stable selectors only where useful for tests.

## Acceptance criteria
- No Tailwind utility soup remains in `packages/features/src/profiles`.
- Skeleton geometry and responsive behavior remain visually equivalent.
- Class names describe product/component intent rather than raw layout values.

## Verification
Run literal utility-class search across `packages/features`, feature tests/typecheck, targeted visual check, and `git diff --check`.
