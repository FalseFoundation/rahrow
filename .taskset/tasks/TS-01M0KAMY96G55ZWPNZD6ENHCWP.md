---
id: TS-01M0KAMY96G55ZWPNZD6ENHCWP
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
  - TS-01M0K4Q9JK7MQFS53BBBWHYMVX
  - TS-01M0K4Q9JNYV1EFNZFRFS4N00P
parent: TS-01M0K4R0P3FQGX31SSNK552055
directories:
  - apps/desktop
  - apps/mobile
projects:
  - rahrow
---

Implement desktop/mobile app-local features for profiles and subscriptions: list, add, edit, duplicate, delete, import, export, refresh subscription, and test profile. Reuse core storage/import/serialization contracts, keep screens app-owned until genuine reuse is proven, and avoid extracting profile feature packages prematurely.
