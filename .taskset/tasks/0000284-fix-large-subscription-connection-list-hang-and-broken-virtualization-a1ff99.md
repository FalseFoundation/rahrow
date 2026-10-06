---
id: a1ff99
title: Fix large subscription connection list hang and broken virtualization
status: done
priority: high
owner: junkieshuffle
assignees:
  - junkieshuffle
createdAt: 2026-10-05 21:41 UTC
updatedAt: 2026-10-05 21:45 UTC
labels:
  - bug
  - performance
  - connections
related:
  - d3b5e4
  - 285b7b
  - 544bb1
  - a629c8
files:
  - packages/features/src/profiles/ConnectionCollection.tsx
  - packages/features/src/profiles/profile-list-virtual-model.ts
directories:
  - packages/features/src/profiles
projects:
  - rahrow
---

## Outcome

Opening a subscription with a large profile set (for example the public `all_sub` feed with ~1.7k entries) keeps the Connections UI responsive: bounded DOM via TanStack Virtual, progressive paging, and no layout break or main-thread hang on desktop/mobile WebViews.

## Context

Users see hang/broken UI when expanding or viewing a large imported subscription already present on Android. Prior virtualization work (`d3b5e4`, `285b7b`) exists but does not cover this regression.

## In scope

- Diagnose Static vs Virtual path, scroll-owner binding, progressive `loadedProfileCount`, and default-open group behavior.
- Fix root cause in `packages/features` shared UI (desktop and mobile must stay identical).
- Add Vitest regression coverage (prefer real `@tanstack/react-virtual` browser/jsdom contract tests; avoid mocks that hide the bug).
- Optionally exercise with agent-browser against `apps/desktop` web if useful.

## Checklist

- [x] Reproduce hang/break with large fixture (~1k–10k or provider-realistic)
- [x] Identify root cause (unbounded scroll rect, paging race, default-open, etc.)
- [x] Implement fix without nested scroll areas
- [x] Add failing-then-passing Vitest coverage
- [x] Record research/lesson and link here

## Acceptance criteria

- Opening a ~1.7k+ profile subscription keeps rendered profile row DOM bounded (well under full set size).
- UI remains interactive (no multi-second main-thread stall on open).
- Existing virtualization contracts and ProfileManagement tests still pass.
- `pnpm exec vitest run --project @rahrow/features` covers the new cases.

## Changeset

Not required — private app/feature bugfix; ship with next product version bump when ready.

## References

- https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/all_sub.txt
- TanStack Virtual: https://tanstack.com/virtual/latest
- Related: d3b5e4, 285b7b
- Research: `.taskset/research/0000003-large-subscription-virtualization-hang-from-zero-height-measure-loops-544bb1.md` (`544bb1`)
- Lesson: `.taskset/lessons/0000003-do-not-dynamically-measure-fixed-connection-virtual-rows-a629c8.md` (`a629c8`)
