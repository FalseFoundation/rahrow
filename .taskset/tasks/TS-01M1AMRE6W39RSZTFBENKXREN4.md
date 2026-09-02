---
id: TS-01M1AMRE6W39RSZTFBENKXREN4
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
  - TS-01M1AMRDX2DS51W5FQHMXJTGQ5
parent: TS-01M1AM68XJ5G8CNBTBZ84C12EM
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
