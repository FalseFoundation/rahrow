---
id: 55e6c8
title: Pace and serialize every Smart Connect action with TanStack Pacer
status: done
priority: high
risk: high
createdAt: 2026-09-02 03:49 UTC
updatedAt: 2026-09-02 16:49 UTC
labels:
  - smart-connect
  - tanstack-pacer
  - concurrency
  - cancellation
  - connection-lifecycle
related:
  - d3b5e4
  - a98de3
parent: "665301"
directories:
  - packages/features/src/home
  - packages/features/src/profiles
  - packages/core/src/connection
projects:
  - rahrow-cross-platform-hardening
  - rahrow-phase-03-product-state-and-data
---

Use TanStack Pacer as the single bounded scheduling layer for manual and scheduled Smart Connect candidate tests, repeated triggers, cancellation, and winner application. Define explicit concurrency, queue, debounce/throttle, abort, retry, unmount, and supersession semantics. Prevent duplicate runners and connection races while keeping progress truthful.

Acceptance covers rapid taps, overlapping background/manual runs, app resume, route changes, candidate deletion or lock changes, offline recovery, engine/mode changes, cancellation, stale results, and deterministic queue cleanup.
