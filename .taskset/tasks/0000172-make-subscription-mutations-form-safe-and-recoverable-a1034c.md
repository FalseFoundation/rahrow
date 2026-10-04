---
id: a1034c
title: Make subscription mutations form-safe and recoverable
status: done
priority: high
risk: high
createdAt: 2026-08-31 01:12 UTC
updatedAt: 2026-08-31 01:20 UTC
labels:
  - subscriptions
  - accessibility
  - hardening
parent: 341ae0
directories:
  - packages/features/src/subscriptions
projects:
  - rahrow-uiux
---

Test and harden add, refresh, and remove mutations for native form semantics, duplicate prevention, pending locks, explicit replacement, consequence-aware confirmation, and visible recoverable errors without changing colors.
