---
id: TS-01M1AP40VSWCR0R1AQRPFXETNG
title: Render zero-millisecond latency as a red timeout
status: done
priority: high
risk: medium
createdAt: 2026-08-31 01:14 UTC
updatedAt: 2026-08-31 03:07 UTC
labels:
  - latency
  - timeout
  - connections
  - diagnostics
related:
  - TS-01M19Z4BT4GMWQ214K6MANHK8C
parent: TS-01M19V6VYXDRMGVQ8XZKAXPR49
files:
  - packages/features/src/profiles/profile-management-model.ts
  - packages/features/src/profiles/useProfileManagement.ts
  - packages/features/src/profiles/ProfileManagement.tsx
  - packages/features/src/profiles/Profiles.module.css
  - packages/features/src/home/home-model.ts
  - packages/features/src/home/Home.tsx
  - packages/features/src/home/Home.module.css
  - packages/core/src/runtime/proxy-engine.ts
directories:
  - packages/features/src/profiles
  - packages/features/src/home
  - packages/core/src/runtime
  - packages/engine/src/runtime
projects:
  - rahrow
---

## Purpose

Treat a reported latency of 0 milliseconds as an invalid or timed-out probe result and display the word timeout in red instead of 0 ms everywhere user-facing latency appears.

## Domain and presentation contract

- Normalize latency results at one shared boundary before screen rendering.
- A finite latency greater than zero is a successful measurement.
- Zero is not a valid successful measurement for this product contract; map it to a timeout/unreachable result.
- Negative, NaN, infinite, missing, canceled, and explicit unreachable results must remain distinguishable in internal state and map to appropriate user-facing unavailable, canceled, error, or timeout labels.
- Preserve the raw probe error/reason for logs and diagnostics; do not erase useful failure context by coercing every failure to zero.
- Render timeout as destructive/red text with accessible semantic text. Do not rely on red alone and do not animate NumberTicker for failures.
- Apply the same formatter to Home telemetry, Connections rows, batch latency sorting/results, toasts, and any CLI-facing shared formatter where applicable.
- Successful sorting places positive measured latency first and timeout/failed/untested groups deterministically afterward.

## Acceptance criteria

- Unit tests cover 0, positive integer, positive decimal, negative, NaN, infinity, undefined, canceled, unreachable, and explicit timeout results.
- Home and Connections render red timeout for zero and never render 0 ms.
- Screen-reader output says timeout and does not announce zero milliseconds.
- Batch tests prove timeout entries do not sort ahead of successful low-latency entries.
- Engine/platform adapter tests ensure real successful results are positive and timeout reasons survive to diagnostics.
- Desktop and mobile shared UI produce identical labels and styling.
