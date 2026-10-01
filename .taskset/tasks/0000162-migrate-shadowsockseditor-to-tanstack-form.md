---
id: 0000162-migrate-shadowsockseditor-to-tanstack-form
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
  - 0000159-define-the-shared-tanstack-form-contract-for-protocol-editors
parent: 0000152-unify-protocol-creation-and-editing-forms
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
