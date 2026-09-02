---
id: TS-01M1AMRF62SG9A69GWGF5ABNBJ
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
  - TS-01M1AMRA9MVF6XQT6ETHRJSQZR
  - TS-01M1AMRAN30221ECERQBYEPWK3
  - TS-01M1AMRAZTCTMHK5MJX98H2SY0
  - TS-01M1AMRB9WRQ3JBM7PV67G9RTD
  - TS-01M1AMRBMAAEEVG4Y73R0T5C3M
  - TS-01M1AMRBZJKA5GEVTV0BJ4EFEJ
  - TS-01M1AMRCA6VZ1KPN162FETFPXH
  - TS-01M1AMRCNPDZE3PVH5J4XZTN8X
  - TS-01M1AMRD0GGWFTRPBDPJRJ4CYX
  - TS-01M1AMRD9TES83WR49JTC1VXKF
  - TS-01M1AMRDKBEGWGBH8E3RPXFCHW
  - TS-01M1AMRDX2DS51W5FQHMXJTGQ5
  - TS-01M1AMRE6W39RSZTFBENKXREN4
  - TS-01M1AMREH8G546XZYX4JQY0YP4
  - TS-01M1AMREVHZGJCXSKETW9CS5HN
parent: TS-01M1AM68XJ5G8CNBTBZ84C12EM
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
