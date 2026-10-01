---
id: 0000064-build-the-shared-subscriptions-screen
title: Build the shared Subscriptions screen
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:32 UTC
updatedAt: 2026-08-23 22:21 UTC
labels:
  - prod-v2
  - ux
  - css-modules
  - p1-product
dependsOn:
  - 0000051-implement-subscription-fetch-decode-and-refresh
  - 0000060-establish-shared-feature-screens-and-css-modules-convention
parent: 0000043-build-identical-desktop-mobile-product-ui-in-packages-features
directories:
  - packages/features
projects:
  - rahrow-uiux
---

Subscriptions screen: add URL, name, refresh, last updated, error isolation, imported profile count.

Do not paste subscription bodies as the only refresh path.

Acceptance: uses core subscription pipeline; identical UI on both apps.
