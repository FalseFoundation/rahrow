---
id: 31a537
title: Build app-local profile and subscription management UX
status: done
priority: medium
risk: medium
createdAt: 2026-08-21 23:31 UTC
updatedAt: 2026-08-22 02:14 UTC
labels:
  - phase-11
  - ui
  - profiles
  - subscriptions
dependsOn:
  - 6d1387
  - "0618e9"
parent: e3eed6
directories:
  - apps/desktop
  - apps/mobile
projects:
  - rahrow
---

Implement desktop/mobile app-local features for profiles and subscriptions: list, add, edit, duplicate, delete, import, export, refresh subscription, and test profile. Reuse core storage/import/serialization contracts, keep screens app-owned until genuine reuse is proven, and avoid extracting profile feature packages prematurely.
