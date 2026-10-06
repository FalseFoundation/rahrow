---
id: 544bb1
type: research
title: Large subscription virtualization hang from zero-height measure loops
status: ready
owner: junkieshuffle
createdAt: 2026-10-05 21:44 UTC
updatedAt: 2026-10-05 21:45 UTC
related:
  - a1ff99
  - a629c8
files:
  - packages/features/src/profiles/ConnectionCollection.tsx
directories:
  - packages/features/src/profiles
projects:
  - rahrow
---

## Question

Why does opening a large subscription (~1.7k profiles, e.g. public `all_sub`) hang and break the Connections UI even though TanStack Virtual and progressive paging are already adopted?

## Evidence

- Reproduced in Vitest/jsdom with the real `@tanstack/react-virtual` (no mock) via `ConnectionCollection.scale.test.tsx`.
- Failure mode before the fix: `Maximum update depth exceeded` from `Virtualizer.measureElement` → `resizeItem` → `notify` → React state updates.
- Zero-height measurements make every item’s `end` ≈ 0, so `calculateRange` treats the entire loaded window as visible. Progressive paging then grows `loadedProfileCount` toward the full subscription, remounting ever more rows and livelocking the renderer.
- The same pattern is plausible on Android WebViews when absolutely positioned rows measure before layout.

## Recommendation

1. Use fixed row estimates for connection rows (including first-profile padding) and do not attach `measureElement` refs for this list.
2. Cap extracted virtual indexes so an unbounded scroll rect cannot mount thousands of nodes.
3. Gate progressive paging on a usable viewport height and proximity to the loaded tail.
4. Keep regression tests on the real virtualizer; mocked virtualizer tests cannot catch this class of bug.

## References

- https://raw.githubusercontent.com/MatinGhanbari/v2ray-configs/main/subscriptions/v2ray/all_sub.txt
- https://tanstack.com/virtual/latest
