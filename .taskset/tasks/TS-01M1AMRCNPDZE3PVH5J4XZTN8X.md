---
id: TS-01M1AMRCNPDZE3PVH5J4XZTN8X
title: Migrate ShadowsocksEditor to TanStack Form
status: done
priority: high
risk: medium
createdAt: 2026-08-31 00:50 UTC
updatedAt: 2026-08-31 03:45 UTC
labels:
  - architecture-audit
  - forms
  - tanstack-form
  - profiles
  - shadowsocks
dependsOn:
  - TS-01M1AMRBMAAEEVG4Y73R0T5C3M
parent: TS-01M1AMKC32ZPMZ606TN76DW6R3
files:
  - packages/features/src/profiles/ShadowsocksEditor.tsx
  - packages/features/src/profiles/shadowsocks-profile-model.ts
directories:
  - packages/features/src/profiles
projects:
  - rahrow
---

## Context
`ShadowsocksEditor` rebuilds form state and async submission with local `useState`, despite the adopted TanStack Form layer.

## Scope
- Adopt the shared TanStack Form contract for Shadowsocks create/edit.
- Keep cipher choices, endpoint validation, password handling, metadata preservation, and share URL behavior in typed models.
- Reset defaults correctly when the edited profile changes.
- Keep the component render-focused.

## Acceptance criteria
- No per-field `useState` tree remains.
- Create/edit defaults, supported method selection, invalid port, required password, metadata preservation, pending state, and failure paths are tested.
- Secret values are not logged or included in error text.
- Profile and share-URL semantics remain unchanged.

## Verification
Run Shadowsocks editor/model tests, feature typecheck/test, and `git diff --check`.
