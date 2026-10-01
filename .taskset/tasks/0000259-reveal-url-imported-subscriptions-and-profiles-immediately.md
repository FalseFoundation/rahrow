---
id: 0000259-reveal-url-imported-subscriptions-and-profiles-immediately
title: Reveal URL-imported subscriptions and profiles immediately
status: done
priority: urgent
risk: high
createdAt: 2026-09-02 03:49 UTC
updatedAt: 2026-09-02 16:49 UTC
labels:
  - connections
  - subscriptions
  - url-import
  - state
  - tanstack-query
  - reported-regression
related:
  - 0000132-move-subscription-loading-and-refresh-to-responsive-background-state
  - 0000111-build-one-connection-import-drawer-and-preserve-subscription-ownership
parent: 0000189-make-connections-mutations-failure-safe-and-consequence-aware
directories:
  - packages/features/src/profiles
  - packages/features/src/subscriptions
  - packages/core/src/storage
projects:
  - rahrow-uiux
  - rahrow-cross-platform-hardening
  - rahrow-phase-03-product-state-and-data
---

After a successful URL import, update the canonical connection/subscription cache and invalidate or patch every dependent query so the imported subscription and profiles render immediately. A page reload or pull-to-refresh must never be required. Preserve subscription ownership, deduplication, selected state, sorting, virtualization, offline persistence, and failure rollback.

Acceptance covers standalone profile URLs, subscription URLs, duplicates, slow fetch, background completion, repeated imports, route changes, desktop/mobile shared UI, and a failed persistence or refresh after optimistic UI.
