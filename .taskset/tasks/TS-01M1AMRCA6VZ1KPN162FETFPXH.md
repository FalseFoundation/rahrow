---
id: TS-01M1AMRCA6VZ1KPN162FETFPXH
title: Migrate SecureProtocolEditor to TanStack Form
status: done
priority: high
risk: medium
createdAt: 2026-08-31 00:50 UTC
updatedAt: 2026-08-31 03:49 UTC
labels:
  - architecture-audit
  - forms
  - tanstack-form
  - profiles
  - protocols
dependsOn:
  - TS-01M1AMRBMAAEEVG4Y73R0T5C3M
parent: TS-01M1AMKC32ZPMZ606TN76DW6R3
files:
  - packages/features/src/profiles/SecureProtocolEditor.tsx
  - packages/features/src/profiles/secure-protocol-profile-model.ts
directories:
  - packages/features/src/profiles
projects:
  - rahrow
---

## Context
`SecureProtocolEditor` independently manages protocol, endpoint, SSH, TLS, Hysteria bandwidth, obfuscation, save state, and error state inside a final UI component.

## Scope
- Adopt the shared TanStack Form contract for SSH, Hysteria, and Hysteria2 create/edit flows.
- Model protocol-dependent fields and validation without leaking inactive-field values.
- Preserve existing metadata/tags, optional obfuscation semantics, default bandwidth values, and edit identity.
- Keep draft-to-`ConnectionProfile` transformation pure and tested.

## Acceptance criteria
- No per-field `useState` tree remains.
- Protocol switching updates visible fields and validation predictably.
- SSH and Hysteria/Hysteria2 payloads round-trip with existing semantics.
- Async pending/error behavior is accessible and double submission is prevented.
- Existing callers need no platform-specific behavior.

## Verification
Run secure editor/model tests, feature typecheck/test, and `git diff --check`.
