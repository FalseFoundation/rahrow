---
id: 0000219-make-lock-state-an-invariant-for-cleanup-and-destructive-connection-acti
title: Make lock state an invariant for cleanup and destructive connection actions
status: done
priority: urgent
risk: high
createdAt: 2026-09-01 21:20 UTC
updatedAt: 2026-09-01 23:20 UTC
labels:
  - cross-platform-hardening
  - connections
  - cleanup
  - locking
  - data-safety
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
related:
  - 0000201-add-verified-connections-cleanup-flow
  - 0000202-lock-connections-cleanup-drawer-during-active-work
parent: 0000203-harden-reported-behavior-across-every-rahrow-platform
directories:
  - packages/core/src/profile
  - packages/core/src/subscription
  - packages/features/src/profiles
  - apps/cli
projects:
  - rahrow-core
  - rahrow-cross-platform-hardening
---

## Problem

Connections cleanup currently protects a locked subscription record, but profile removal is derived separately. Locking must protect the complete aggregate and every destructive entry point, not only one store row.

## Domain contract

Define which aggregates can be locked: subscription sources, subscription-owned groups/profiles, standalone profile groups, and standalone profiles where the product exposes locking. A locked parent protects its descendants. Cleanup/purge, bulk delete, replace, subscription refresh replacement, reset scopes, import conflict resolution, and CLI destructive commands must consult the same policy. Read-only latency tests and diagnostics may run only when clearly non-mutating.

Build the purge plan from immutable identifiers, then re-read and revalidate current lock/ownership state immediately before atomic commit. Items locked after scanning are skipped. Unlocking requires an explicit user action; no purge or refresh may clear a lock as a side effect.

## User communication

Before confirmation, state that locked connections are always preserved and show the locked/skipped count separately from passed, failed, removable, and total counts. After completion, report removed and skipped-locked counts. If everything failed but is locked, do not offer a misleading destructive confirmation. CLI dry-run and commit output must report the same categories.

## Acceptance

Table-driven tests cover locked subscriptions and descendants, standalone lockable items, mixed groups, orphaned ownership, a lock changing between scan and commit, stale snapshots, retry/cancel, store failure, and idempotent reruns. Verify shared Android/iOS/macOS/Linux/Windows behavior and equivalent CLI purge semantics.
