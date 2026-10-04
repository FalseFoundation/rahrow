---
id: 759b29
title: Extract the subscription-store contract and JSON adapter from features
status: done
priority: high
risk: high
createdAt: 2026-08-31 00:50 UTC
updatedAt: 2026-08-31 02:53 UTC
labels:
  - architecture-audit
  - storage
  - subscriptions
  - dependency-inversion
parent: 64a98e
files:
  - packages/features/src/subscriptions/subscription-store.ts
  - packages/features/src/app/runtime.tsx
  - packages/core/src/storage/json-store.ts
  - apps/desktop/src/lib/app-runtime.ts
  - apps/mobile/src/lib/app-runtime.ts
directories:
  - packages/core/src/storage
  - packages/features/src/subscriptions
  - apps/desktop/src/lib
  - apps/mobile/src/lib
projects:
  - rahrow
---

## Context
`JsonSubscriptionStore` is implemented in `@rahrow/features`, and `AppRuntime` depends on that concrete class. Desktop and mobile therefore import persistence infrastructure from the UI layer.

## Scope
- Define a small `SubscriptionStore` capability contract in the owning lower layer.
- Move the JSON subscription adapter and its tests beside the existing profile/settings JSON stores, unless a separate `packages/storage` boundary is demonstrably justified by the final dependency graph.
- Type `AppRuntime.subscriptionStore` against the contract.
- Update desktop, mobile, feature tests, and exact-file imports.
- Preserve the wildcard package export convention; add no barrel or compatibility re-export.

## Acceptance criteria
- `packages/features` contains no concrete subscription persistence implementation.
- No app imports a storage adapter from `@rahrow/features`.
- Runtime and hooks depend on `SubscriptionStore`, not `JsonSubscriptionStore`.
- Existing list/save/remove behavior and deterministic ordering remain covered.
- Published-package API movement receives a Changeset when required.

## Verification
Run focused core/storage and feature tests, desktop/mobile typechecks, `pnpm exec taskset doctor`, and `git diff --check`.

## Out of scope
Do not introduce a database, indexed persistence, server storage, or a generic repository framework.
