---
id: 936c43
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
  - 33ec61
parent: a27174
directories:
  - packages/ui
projects:
  - rahrow-uiux
---

Add only the Shadcn primitives the product screens need: dialog, sheet, toast, dropdown, tooltip.

Acceptance: primitives live in packages/ui; features consume them; no extra design-system catalogue.
