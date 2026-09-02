---
id: TS-01M1AMRDKBEGWGBH8E3RPXFCHW
title: Remove the AppShell compatibility re-export and restore exact ownership
status: done
priority: medium
risk: low
createdAt: 2026-08-31 00:50 UTC
updatedAt: 2026-08-31 02:53 UTC
labels:
  - architecture-audit
  - app-shell
  - exports
  - cleanup
parent: TS-01M1AMKBF2C7BPHTQKZ28K2QJQ
files:
  - packages/features/src/app/AppShell.tsx
  - packages/features/src/app/router.tsx
directories:
  - packages/features/src/app
  - apps/desktop/src
  - apps/mobile/src
projects:
  - rahrow
---

## Context
`AppShell.tsx` is a one-line re-export of a symbol defined in `router.tsx`, violating the no-barrel/no-compatibility-wrapper rule.

## Scope
- Make the defining file and exported symbol agree: either move the component into `AppShell.tsx` with explicit router dependencies or rename/restructure the router module so consumers import the defining file directly.
- Update desktop/mobile and test imports.
- Keep route creation, provider order, navigation, and runtime scoping unchanged.
- Delete the wrapper rather than leaving a compatibility export.

## Acceptance criteria
- Every `AppShell` import targets the file that defines it.
- No one-line re-export wrapper remains.
- The feature package still relies on the wildcard export map only.
- Router/provider/navigation tests pass without behavior drift.

## Verification
Run app-shell/router tests, desktop/mobile typechecks, repository barrel checks, and `git diff --check`.
