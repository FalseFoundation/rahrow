---
title: Synchronization
description: Provider-neutral ownership, conflict, deletion, and apply rules for RahRow adapters.
---

# Synchronization

Synchronization is an explicit adapter workflow around canonical `.rahrow/`
files. A provider record, identity mapping, baseline, revision, or cache never
becomes an alternate RahRow task store.

## Core Policy

`@rahrow/contracts` defines pull, push, and bidirectional data, plan, conflict,
checkpoint, and result types. `@rahrow/core` owns:

- deterministic plan ordering and dry runs
- local and external stale-read fingerprints
- field-level three-way comparison against the last synchronized baseline
- deletion policy and conflict detection
- canonical task validation and relationship integrity
- failure-safe local apply through the shared filesystem transaction boundary

Plans report creates, updates, deletions, unchanged records, and unresolved
conflicts before mutation. Apply rejects any plan with conflicts and re-reads
both sides to reject stale input.

## Adapter Ownership

Provider adapters own authentication, pagination, rate limits, provider field
mapping, remote revisions, and atomic application of external changes and
checkpoints. They return explicit external identities and optional canonical
task IDs. They must not write `.rahrow/` files directly.

Adapters apply their changes before core mutates canonical files. An adapter
failure therefore leaves canonical RahRow state unchanged. Adapters should
make their own batch operation atomic or expose the provider's partial-failure
details; core cannot claim to roll back a remote service.

## Identity And Baselines

Identity mappings are adapter records, not canonical task metadata. A
remote-only record receives a deterministic RahRow ID in its synchronization
plan, and the adapter checkpoint records that mapping after apply.

Each synchronized record may carry a baseline containing the prior shared task
data and stale-read revisions. Bidirectional synchronization merges
non-overlapping field changes. Different edits to the same field, or deletion
combined with an unsynchronized edit, produce conflicts.

## Deletion

The default deletion behavior is `preserve`. With `delete`, deletion propagates
only when the surviving side has not changed from the baseline. Otherwise the
plan reports a record-level conflict. Local deletion also remains subject to
the task graph's inbound-dependency policy.
