---
id: 0c3e97
title: Consolidate HTTP subscription fetching below applications and features
status: done
priority: high
risk: high
createdAt: 2026-08-31 00:50 UTC
updatedAt: 2026-08-31 03:27 UTC
labels:
  - architecture-audit
  - subscriptions
  - networking
  - deduplication
  - security
parent: 64a98e
files:
  - packages/features/src/app/http-subscription-fetcher.ts
  - apps/cli/src/commands.ts
  - apps/desktop/src/lib/app-runtime.ts
  - apps/mobile/src/lib/mobile-subscription-fetcher.ts
  - packages/core/src/subscription/subscription-import.ts
directories:
  - packages/core/src/subscription
  - packages/features/src/app
  - apps/cli/src
  - apps/desktop/src/lib
  - apps/mobile/src/lib
projects:
  - rahrow
---

## Context
HTTP subscription response handling is duplicated in the CLI and `@rahrow/features`. Desktop and mobile also wrap the feature implementation, leaving reusable networking behavior owned by the UI package.

## Scope
- Establish one engine-neutral HTTP subscription fetch implementation in the nearest meaningful lower-level owner; create `packages/subscriptions` only if the existing core boundary cannot accept the adapter without browser/Node leakage.
- Inject fetch, credential resolution, headers/user-agent policy, and platform-native transport where needed.
- Preserve secure URL validation, redirect rejection, bounded response reads, metadata parsing, URL redaction, and credential handling.
- Keep native desktop/mobile transport selection at app edges.
- Remove the CLI and feature duplicates and update exact-file imports/tests.

## Acceptance criteria
- Shared HTTP response policy has one implementation.
- CLI, desktop, and mobile consume the same contract and common policy.
- `packages/features` performs no subscription HTTP transport.
- Credential and error-redaction tests cover authenticated and unauthenticated paths.
- Platform-specific native fetch paths remain injectable and capability-gated.
- No executable download or external runtime dependency is introduced.

## Verification
Run subscription/core tests, CLI tests, desktop/mobile typechecks, cross-interface tests, and `git diff --check`.
