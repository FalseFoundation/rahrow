---
title: "ADR 0003: Snapshot Policy"
description: Use Git for history and reserve RahRow snapshots for explicit safety checkpoints.
---

# ADR 0003: Snapshot Policy

- Status: Accepted
- Date: 2026-06-12

## Context

RahRow needs safe mutation and recovery, but Git already records durable
project history. A second automatic history system would duplicate state and
confuse authority.

## Decision

- Git remains the normal task history and rollback system.
- Prefer dry runs, atomic writes, validation, diffs, and Git-aware warnings.
- The explicit snapshot subsystem protects uncommitted state before schema
  migrations and supports user-invoked safety checkpoints.
- Snapshots are immutable, non-authoritative, conflict-aware on restore, and
  removable without changing current project state.
- Migration and restore preview by default. Migration snapshots before apply;
  restore requires an explicit `--apply`.

## Consequences

Snapshots add a bounded recovery mechanism without becoming hidden history.
They live under `.rahrow/snapshots/`, remain disposable, and never replace Git.
