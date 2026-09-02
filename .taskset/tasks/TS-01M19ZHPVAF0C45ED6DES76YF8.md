---
id: TS-01M19ZHPVAF0C45ED6DES76YF8
title: Move subscription loading and refresh to responsive background state
status: done
priority: high
risk: medium
createdAt: 2026-08-30 18:40 UTC
updatedAt: 2026-08-30 18:48 UTC
labels:
  - subscriptions
  - tanstack-query
  - performance
parent: TS-01M19V6VYXDRMGVQ8XZKAXPR49
directories:
  - packages/features
projects:
  - rahrow
---

Use TanStack Query for subscription collection state, keep existing profiles visible during refresh, track refresh state per subscription, close import promptly after persistence, refresh in background, reload profiles on subscription revision, and use skeletons/spinners plus Sonner feedback instead of data flashes.
