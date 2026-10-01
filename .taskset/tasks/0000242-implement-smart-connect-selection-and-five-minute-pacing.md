---
id: 0000242-implement-smart-connect-selection-and-five-minute-pacing
title: Implement Smart Connect selection and five-minute pacing
status: done
priority: urgent
risk: critical
createdAt: 2026-09-01 23:59 UTC
updatedAt: 2026-09-02 00:18 UTC
labels:
  - smart-connect
  - tanstack-pacer
  - connection-lifecycle
  - profiles
  - subscriptions
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
parent: 0000239-post-connect-intelligence-and-background-smart-connect
directories:
  - packages/core
  - packages/features/src/profiles
  - apps/cli
projects:
  - rahrow-core
  - rahrow-cross-platform-hardening
---

Define Smart Connect as a cancellable operation that measures every eligible standalone and subscription-owned profile with bounded concurrency, excludes invalid/locked-for-destructive-only distinctions correctly, chooses the fastest successful result with deterministic ties, and connects through the existing engine/mode lifecycle. Use TanStack Pacer queue/rate policy rather than ad hoc fan-out. Persist enabled state and last decision, rerun at most every five minutes while enabled, revalidate profile/engine/mode immediately before switching, avoid reconnect when the winner is already active, and roll back or retain the healthy current connection when candidates fail. CLI exposes explicit start/stop/status/run semantics and never relies on a renderer timer.
