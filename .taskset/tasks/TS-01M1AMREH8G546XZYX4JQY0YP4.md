---
id: TS-01M1AMREH8G546XZYX4JQY0YP4
title: Rename feature hook files to the camelCase convention
status: done
priority: low
risk: low
createdAt: 2026-08-31 00:50 UTC
updatedAt: 2026-08-31 02:53 UTC
labels:
  - architecture-audit
  - naming
  - hooks
  - cleanup
parent: TS-01M1AM68XJ5G8CNBTBZ84C12EM
files:
  - packages/features/src/home/use-connection-theme.ts
  - packages/features/src/home/use-connection-theme.test.ts
  - packages/features/src/profiles/use-pull-to-refresh.ts
directories:
  - packages/features/src/home
  - packages/features/src/profiles
projects:
  - rahrow
---

## Context
React hook files use kebab-case even though RahRow requires camelCase hook filenames matching their exported hook names.

## Scope
- Rename `use-connection-theme.ts` and its test to `useConnectionTheme.ts` / `useConnectionTheme.test.ts`.
- Rename `use-pull-to-refresh.ts` to `usePullToRefresh.ts`.
- Update every exact-file import and repository reference.
- Leave ordinary non-hook TypeScript files in kebab-case.

## Acceptance criteria
- Hook filenames match exported hook symbols.
- No old-path compatibility file or re-export is introduced.
- Case-sensitive filesystem and CI imports resolve correctly.
- Tests retain coverage for document theme state and pull-to-refresh behavior.

## Verification
Run focused hook tests, feature typecheck, repository filename search, and `git diff --check`.
