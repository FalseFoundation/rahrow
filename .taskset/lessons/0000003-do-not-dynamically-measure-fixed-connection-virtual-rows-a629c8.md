---
id: a629c8
type: lesson
title: Do not dynamically measure fixed connection virtual rows
status: active
owner: junkieshuffle
createdAt: 2026-10-05 21:44 UTC
updatedAt: 2026-10-05 21:44 UTC
related:
  - a1ff99
  - 544bb1
directories:
  - packages/features/src/profiles
projects:
  - rahrow
severity: high
relatedSkills:
  - .agents/skills/rahrow-implement/SKILL.md
---

## Trigger / symptom

Opening or viewing a subscription with a very large profile set hangs the Connections UI (Android WebView or Vitest/jsdom) with a broken virtual list, often after TanStack Virtual is already wired.

## Incorrect pattern

Attach `virtualizer.measureElement` to every connection row and rely on progressive paging alone. Zero-height measurements expand the visible range to the full loaded window; near-end paging then grows the window until React livelocks.

## Correct pattern

Drive uniformly sized connection rows with stable `estimateSize` values (encode first-profile padding in the estimate), cap extracted virtual indexes, and page only when the scroll viewport has a real height and the user is near the loaded tail. Regression-test against the real `@tanstack/react-virtual`, not a mock that hides measurement.

## Blast radius / severity

High for Connections on desktop and mobile: any large subscription can freeze the shared feature UI. Diagnostics logs use a similar measure pattern but usually smaller datasets.

## Prevention

Keep large-list Vitest coverage on the real virtualizer with ~1k–10k fixtures. Treat mocked virtualizer tests as contract checks only. Prefer fixed estimates for fixed-height product rows.

## Evidence

- Research: `.taskset/research/0000003-large-subscription-virtualization-hang-from-zero-height-measure-loops-544bb1.md` (`544bb1`)
- Task: `a1ff99`
- Tests: `packages/features/src/profiles/ConnectionCollection.scale.test.tsx`
