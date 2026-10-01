---
id: 0000160-migrate-standardprotocoleditor-to-tanstack-form
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
  - 0000159-define-the-shared-tanstack-form-contract-for-protocol-editors
parent: 0000152-unify-protocol-creation-and-editing-forms
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
