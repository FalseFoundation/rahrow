---
id: 0000063-build-the-shared-profiles-editor-and-list
title: Build the shared Profiles editor and list
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
  - 0000060-establish-shared-feature-screens-and-css-modules-convention
parent: 0000043-build-identical-desktop-mobile-product-ui-in-packages-features
directories:
  - packages/features
projects:
  - rahrow-uiux
---

Replace the developer-style ProfileManagement panel with a product Profiles feature: list, add, edit, duplicate, delete, import, export, share, QR, test.

Use TanStack Form for the editor. Style with CSS Modules.

Acceptance: same Profiles UI on desktop and mobile; no protocol parsing in components.
