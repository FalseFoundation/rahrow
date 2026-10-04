---
id: a4730a
title: Define the shared TanStack Form contract for protocol editors
status: done
priority: high
risk: medium
createdAt: 2026-08-31 00:50 UTC
updatedAt: 2026-08-31 03:30 UTC
labels:
  - architecture-audit
  - forms
  - tanstack-form
  - profiles
  - fba
parent: 745aa0
files:
  - packages/features/src/profiles/ConnectionProfileEditor.tsx
directories:
  - packages/features/src/import
  - packages/features/src/profiles
projects:
  - rahrow
---

## Context
The canonical profile editor uses TanStack Form, while the manual protocol editors independently rebuild value state, validation, submission, pending state, and errors with many `useState` calls.

## Scope
- Extract the smallest reusable TanStack Form conventions demonstrated by the canonical editor.
- Define typed default-value, validation-adapter, submit-state, and field-error patterns usable by create and edit flows.
- Keep protocol-specific schemas and draft-to-profile transformations in their owning feature models.
- Avoid a universal form abstraction or boolean-prop-heavy component API.

## Acceptance criteria
- A documented/tested pattern exists for protocol editors to share controlled field and submission behavior.
- The contract supports async save, field/form errors, pending state, reset on profile/protocol change, and accessible error association.
- No protocol-specific domain logic moves into `@rahrow/ui`.
- Existing canonical editor behavior remains unchanged.

## Verification
Run canonical editor tests, feature typecheck, and `git diff --check`.
