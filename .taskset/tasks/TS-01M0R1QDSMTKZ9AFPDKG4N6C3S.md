---
id: TS-01M0R1QDSMTKZ9AFPDKG4N6C3S
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
  - TS-01M0R1QC1VHGH6HV67MPTB7C4K
parent: TS-01M0R1JR37H6GZPSGHBT87H900
directories:
  - packages/ui
projects:
  - rahrow-uiux
---

Add only the Shadcn primitives the product screens need: dialog, sheet, toast, dropdown, tooltip.

Acceptance: primitives live in packages/ui; features consume them; no extra design-system catalogue.
