---
id: 0000156-make-subscription-persistence-fail-closed-on-corrupted-documents
title: Make subscription persistence fail closed on corrupted documents
status: done
priority: urgent
risk: high
createdAt: 2026-08-31 00:50 UTC
updatedAt: 2026-08-31 02:53 UTC
labels:
  - architecture-audit
  - storage
  - subscriptions
  - data-integrity
  - security
dependsOn:
  - 0000155-extract-the-subscription-store-contract-and-json-adapter-from-features
parent: 0000154-move-subscription-infrastructure-below-the-ui-layer
files:
  - packages/features/src/subscriptions/subscription-store.ts
  - packages/core/src/storage/json-store.ts
directories:
  - packages/core/src/storage
projects:
  - rahrow
---

## Context
The current save path catches every `list()` failure and substitutes an empty array. A malformed or unreadable document can therefore be silently overwritten with one new subscription.

## Scope
- Remove the catch-all fallback from subscription save/update behavior.
- Distinguish a genuinely absent document from malformed JSON, invalid schema, and I/O failure.
- Preserve the original document when validation or reading fails.
- Use a specific storage error shape only if it clarifies recovery without adding hierarchy ceremony.
- Add red-first regression tests for malformed JSON, invalid document shape, failed reads, and atomic-write behavior.

## Acceptance criteria
- Saving never overwrites a document whose existing contents could not be read and validated.
- Empty/missing storage still initializes normally.
- Errors are actionable and do not expose credential-bearing subscription URLs.
- Tests prove the original bytes remain unchanged after each failure case.
- Remove and list retain deterministic, validated behavior.

## Verification
Run the owning storage test file, package typecheck, package test suite, and `git diff --check`.
