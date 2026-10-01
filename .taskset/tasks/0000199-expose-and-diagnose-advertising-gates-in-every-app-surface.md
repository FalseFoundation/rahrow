---
id: 0000199-expose-and-diagnose-advertising-gates-in-every-app-surface
title: Expose and diagnose advertising gates in every app surface
status: done
priority: high
risk: medium
createdAt: 2026-08-31 15:19 UTC
updatedAt: 2026-08-31 15:43 UTC
labels:
  - ads
  - diagnostics
related:
  - 0000193-add-policy-safe-composable-advertising-gates
directories:
  - packages/features/src/ads
  - packages/features/src/diagnostics
projects:
  - rahrow
---

Ensure development runtimes configure a test advertising provider, keep the gate mounted above route changes, and expose provider, selection threshold, queue, and presentation state in Diagnostics.
