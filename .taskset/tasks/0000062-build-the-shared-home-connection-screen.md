---
id: 0000062-build-the-shared-home-connection-screen
title: Build the shared Home connection screen
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:31 UTC
updatedAt: 2026-08-23 22:21 UTC
labels:
  - prod-v2
  - ux
  - css-modules
  - p0-blocker
dependsOn:
  - 0000060-establish-shared-feature-screens-and-css-modules-convention
parent: 0000043-build-identical-desktop-mobile-product-ui-in-packages-features
directories:
  - packages/features
projects:
  - rahrow-uiux
---

Home is connection-first: current state, Connect/Disconnect, selected profile, latency, and quick profile selection.

Use CSS Modules for layout. Logic lives in hooks/feature models, not the screen file.

Acceptance: desktop and mobile Home are the same component; Connect exists; local UI state stays out of core.
