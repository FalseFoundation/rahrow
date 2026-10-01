---
id: 0000019-build-app-local-profile-and-subscription-management-ux
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
  - 0000003-implement-import-pipeline-and-subscription-parsing
  - 0000005-implement-local-profile-and-settings-persistence
parent: 0000009-build-connection-oriented-desktop-and-mobile-ux
directories:
  - apps/desktop
  - apps/mobile
projects:
  - rahrow
---

Implement desktop/mobile app-local features for profiles and subscriptions: list, add, edit, duplicate, delete, import, export, refresh subscription, and test profile. Reuse core storage/import/serialization contracts, keep screens app-owned until genuine reuse is proven, and avoid extracting profile feature packages prematurely.
