---
id: TS-01M19Z4CA5JGYJF3PWNKMWJ5MC
title: Scale connection collections with virtualization and paced interactions
status: done
priority: high
risk: medium
createdAt: 2026-08-30 18:32 UTC
updatedAt: 2026-09-02 17:11 UTC
labels:
  - performance
  - tanstack
  - connections
parent: TS-01M19V6VYXDRMGVQ8XZKAXPR49
directories:
  - packages/features
projects:
  - rahrow
  - rahrow-phase-03-product-state-and-data
---

## Purpose

Keep large subscriptions, profile collections, search, refresh, editing, and startup responsive using measured changes rather than adopting libraries by checklist.

## Current state

- TanStack Query owns subscription async state and background refresh.
- TanStack Form owns the canonical profile editor.
- A scoped TanStack Store owns the global share drawer.
- TanStack Virtual already renders bounded diagnostic logs.
- Current production bundles report roughly 900 kB entry chunks.
- Desktop production build reports unresolved font asset warnings.

## Work plan

### Measurement

- Add representative fixtures for 100, 1,000, 10,000, and provider-realistic profile counts.
- Record import parse time, persistence time, query invalidation time, initial render, scroll FPS, search latency, memory, refresh concurrency, and app startup.
- Define budgets per desktop/mobile class and fail CI only on stable reproducible thresholds.

### Rendering and search

- Flatten standalone/subscription group rows into a stable keyed view model.
- Adopt TanStack Virtual for connection rows only above a measured threshold; preserve group headers, selection, focus restoration, screen-reader count/position semantics, and variable row measurement.
- Move sort/filter derivation out of final components.
- Use deferred UI updates or a Web Worker/native worker for CPU-heavy parsing and sorting. Virtualization does not solve parsing.
- Keep previous data visible during Query refetch and show local refresh indicators.

### Scheduling

- Add TanStack Pacer only where profiling proves a need:
  - debounced connection search;
  - concurrency-limited speed-test queue;
  - subscription refresh queue;
  - batched progress updates.
- Expose cancellation, pending count, and per-item progress.
- Do not use Pacer as a substitute for moving synchronous heavy parsing off the UI thread.

### Persistence

- Do not adopt TanStack DB yet.
- Prototype DB only if normalized live queries demonstrably outperform the existing repository and one authority is defined for migrations, durability, native sync, encryption, and atomic subscription replacement.
- Store never owns durable profiles/subscriptions; Query cache never becomes durable storage.

### Hotkeys

- Add TanStack Hotkeys only on hardware-keyboard-capable desktop surfaces.
- Candidate commands: command palette, search, add/import, connect/disconnect, speed test, refresh subscription, and close drawer.
- Document shortcuts, scope them by screen/overlay, filter text inputs, resolve conflicts, and never render dead shortcut UI on touch-only mobile.

### Bundles/assets

- Split feature and platform-only modules with route/dynamic boundaries.
- Keep Tauri/Capacitor modules out of the opposite platform bundle.
- Resolve desktop font URLs and verify fonts offline in packaged builds.
- Establish bundle budgets and inspect duplicate dependencies.

## Acceptance criteria

- Large fixtures do not freeze input or navigation during import/refresh.
- Previous profiles remain usable while a subscription refreshes.
- Selection and focus survive virtualization, sorting, and background replacement.
- Speed tests and refresh queues are cancellable and respect configured concurrency.
- No DB adoption without an approved persistence ADR and migration/rollback proof.
- Mobile ships no desktop hotkey UI or code path that assumes a keyboard.
- Desktop/mobile production bundles pass offline font verification and documented size budgets.
- Performance tests report before/after evidence rather than subjective improvement.
