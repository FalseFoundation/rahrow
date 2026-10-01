---
id: 0000187-make-initial-load-failures-truthful-and-recoverable
title: Make initial load failures truthful and recoverable
status: done
priority: high
risk: high
createdAt: 2026-08-31 02:00 UTC
updatedAt: 2026-08-31 03:07 UTC
labels:
  - p1
  - hardening
  - accessibility
parent: 0000143-run-exhaustive-impeccable-ui-and-ux-hardening-program
directories:
  - packages/features/src
projects:
  - rahrow-uiux
---

Home, Connections, and Subscriptions must distinguish loading failure from an empty/default state, retain error detail safely, expose retry, and lock mutations until initialization succeeds.
