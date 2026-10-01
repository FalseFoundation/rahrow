---
id: 0000170-verify-the-feature-boundary-architecture-audit-remediation
title: Verify the feature-boundary architecture audit remediation
status: todo
priority: high
risk: medium
createdAt: 2026-08-31 00:50 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - architecture-audit
  - validation
  - testing
  - boundaries
dependsOn:
  - 0000155-extract-the-subscription-store-contract-and-json-adapter-from-features
  - 0000156-make-subscription-persistence-fail-closed-on-corrupted-documents
  - 0000157-consolidate-http-subscription-fetching-below-applications-and-features
  - 0000158-separate-profilemanagement-workflows-from-connection-library-rendering
  - 0000159-define-the-shared-tanstack-form-contract-for-protocol-editors
  - 0000160-migrate-standardprotocoleditor-to-tanstack-form
  - 0000161-migrate-secureprotocoleditor-to-tanstack-form
  - 0000162-migrate-shadowsockseditor-to-tanstack-form
  - 0000163-move-relative-time-presentation-out-of-the-subscriptions-feature
  - 0000164-move-profile-count-copy-out-of-the-profiles-feature
  - 0000165-remove-the-appshell-compatibility-re-export-and-restore-exact-ownership
  - 0000166-give-composed-feature-components-matching-css-modules
  - 0000167-remove-tailwind-utility-strings-from-profilemanagement-skeletons
  - 0000168-rename-feature-hook-files-to-the-camelcase-convention
  - 0000169-inject-and-capability-gate-qr-image-downloads
parent: 0000143-run-exhaustive-impeccable-ui-and-ux-hardening-program
directories:
  - packages/features
  - packages/core
  - apps/cli
  - apps/desktop
  - apps/mobile
  - tests
projects:
  - rahrow
  - rahrow-phase-06-verification-and-release-gates
---

## Context
The architecture audit identified storage/network ownership, component orchestration, form-state, cross-feature utility, export-wrapper, CSS, naming, and platform-capability violations.

## Scope
- Re-run structural searches for every audited anti-pattern.
- Verify dependency direction and exact-file imports across core/features/apps.
- Run focused and package-level tests plus desktop/mobile/CLI typechecks.
- Exercise desktop/mobile parity for connections, protocol editing, subscriptions, and global sharing.
- Record any intentionally deferred issue as a new Taskset dependency rather than silently accepting it.

## Acceptance criteria
- No concrete subscription storage or HTTP fetcher remains in `@rahrow/features`.
- No duplicated CLI/common HTTP subscription policy remains.
- Corrupted subscription data cannot be silently overwritten.
- ProfileManagement and protocol editors satisfy the hook/model/form boundaries.
- Cross-feature formatters have explicit shared frontend ownership.
- No compatibility re-export, mismatched feature CSS ownership, feature Tailwind soup, or misnamed hook remains.
- QR download is capability-backed and hidden when unsupported.
- Taskset doctor, repository checks, affected tests, and cross-interface validation pass.

## Verification
Run `pnpm exec taskset doctor`, `pnpm check`, affected package tests/typechecks, cross-interface tests, desktop/mobile builds where available, and `git diff --check`.
