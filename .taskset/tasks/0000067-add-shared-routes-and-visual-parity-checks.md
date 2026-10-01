---
id: 0000067-add-shared-routes-and-visual-parity-checks
title: Add shared routes and visual-parity checks
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:32 UTC
updatedAt: 2026-08-23 22:21 UTC
labels:
  - prod-v2
  - ux
  - visual-parity
  - testing
  - p0-blocker
dependsOn:
  - 0000062-build-the-shared-home-connection-screen
  - 0000063-build-the-shared-profiles-editor-and-list
  - 0000064-build-the-shared-subscriptions-screen
  - 0000065-build-shared-import-qr-clipboard-and-share-flows
  - 0000066-build-shared-diagnostics-and-settings-screens
parent: 0000043-build-identical-desktop-mobile-product-ui-in-packages-features
directories:
  - packages/features
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-uiux
---

Desktop and mobile must mount the same route tree from packages/features. Add a visual-parity check so layout/CSS Module class usage cannot diverge by app.

Acceptance: same screen set and look; app shells do not restyle feature screens.
