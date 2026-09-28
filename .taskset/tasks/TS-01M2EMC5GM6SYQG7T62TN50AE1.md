---
id: TS-01M2EMC5GM6SYQG7T62TN50AE1
title: Complete the Xray Apple native runtime lock
status: todo
priority: high
risk: high
createdAt: 2026-09-14 00:16 UTC
updatedAt: 2026-09-14 00:16 UTC
labels:
  - apple
  - xray
  - native-runtime
  - verification
related:
  - TS-01M1G3RAQ1FN7KY6ZYW811VEJK
files:
  - apps/mobile/native-runtime-lock.json
directories:
  - apps/mobile/native-runtimes/xray
projects:
  - rahrow-mobile
  - rahrow-phase-04-native-runtime-and-capabilities
---

## Outcome

Complete the mobile native runtime lock so repository-wide runtime verification covers Apple as well as Android.

## Scope

- Build or stage the pinned Xray Apple XCFramework artifact.
- Record its SHA-256 and source/toolchain provenance in `apps/mobile/native-runtime-lock.json`.
- Verify the staged artifact matches the lock and the single-application distribution contract.

## Acceptance criteria

- `pnpm --filter @rahrow/mobile native:verify` passes.
- No runtime executable or library is downloaded at application startup.

## Evidence

During Android sing-box crash hardening, repository-wide native verification stopped with `xray apple artifact checksum is missing or invalid`.
