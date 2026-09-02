---
id: TS-01M1AMRBZJKA5GEVTV0BJ4EFEJ
title: Migrate StandardProtocolEditor to TanStack Form
status: done
priority: high
risk: medium
createdAt: 2026-08-31 00:50 UTC
updatedAt: 2026-08-31 03:30 UTC
labels:
  - architecture-audit
  - forms
  - tanstack-form
  - import
  - protocols
dependsOn:
  - TS-01M1AMRBMAAEEVG4Y73R0T5C3M
parent: TS-01M1AMKC32ZPMZ606TN76DW6R3
files:
  - packages/features/src/import/StandardProtocolEditor.tsx
  - packages/features/src/import/manual-profile-model.ts
directories:
  - packages/features/src/import
projects:
  - rahrow
---

## Context
`StandardProtocolEditor` stores every field, submission flag, and error independently and performs async workflow logic inline in the component.

## Scope
- Adopt the shared TanStack Form contract for VLESS, VMess, and Trojan manual creation.
- Move defaults, conditional TLS/SNI rules, port conversion, validation messages, and payload construction into typed form/model adapters.
- Keep the component focused on rendering fields and invoking form handlers.
- Preserve external `formId`, `showSubmit`, `onSavingChange`, and `onSave` behavior unless a deliberate API cleanup updates every consumer.

## Acceptance criteria
- No per-field `useState` tree remains.
- Invalid port, missing credential, protocol-specific label, TLS visibility, pending state, failure, and successful save are tested.
- Submission cannot double-fire while pending.
- Generated `ConnectionProfile` semantics are unchanged.

## Verification
Run the editor/model tests, feature typecheck/test, and `git diff --check`.
