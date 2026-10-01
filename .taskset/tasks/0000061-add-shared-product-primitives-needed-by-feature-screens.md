---
id: 0000061-add-shared-product-primitives-needed-by-feature-screens
title: Add shared product primitives needed by feature screens
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:31 UTC
updatedAt: 2026-08-23 22:21 UTC
labels:
  - prod-v2
  - ui
  - p1-product
dependsOn:
  - 0000060-establish-shared-feature-screens-and-css-modules-convention
parent: 0000043-build-identical-desktop-mobile-product-ui-in-packages-features
directories:
  - packages/ui
projects:
  - rahrow-uiux
---

Add only the Shadcn primitives the product screens need: dialog, sheet, toast, dropdown, tooltip.

Acceptance: primitives live in packages/ui; features consume them; no extra design-system catalogue.
