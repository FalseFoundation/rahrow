---
id: 0698d2
title: Verify the feature-boundary architecture audit remediation
status: done
priority: high
risk: medium
createdAt: 2026-08-31 00:50 UTC
updatedAt: 2026-10-01 10:23 UTC
labels:
  - architecture-audit
  - validation
  - testing
  - boundaries
dependsOn:
  - 759b29
  - 1f2f04
  - 0c3e97
  - 5ea36a
  - a4730a
  - a6b001
  - 998ba7
  - b90ccd
  - d522cf
  - bdd17e
  - eab3b8
  - 25dd19
  - e473fc
  - aea4ae
  - 410b33
parent: 6061f4
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
