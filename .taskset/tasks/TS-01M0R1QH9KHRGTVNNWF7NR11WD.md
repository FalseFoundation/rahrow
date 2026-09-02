---
id: TS-01M0R1QH9KHRGTVNNWF7NR11WD
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
  - TS-01M0R1QC1VHGH6HV67MPTB7C4K
parent: TS-01M0R1JR37H6GZPSGHBT87H900
directories:
  - packages/features
projects:
  - rahrow-uiux
---

Replace the developer-style ProfileManagement panel with a product Profiles feature: list, add, edit, duplicate, delete, import, export, share, QR, test.

Use TanStack Form for the editor. Style with CSS Modules.

Acceptance: same Profiles UI on desktop and mobile; no protocol parsing in components.
