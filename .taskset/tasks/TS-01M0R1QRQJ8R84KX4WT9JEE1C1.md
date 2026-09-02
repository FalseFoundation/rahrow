---
id: TS-01M0R1QRQJ8R84KX4WT9JEE1C1
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
  - TS-01M0R1QFF9P2PTQREKTJ6D22B6
  - TS-01M0R1QH9KHRGTVNNWF7NR11WD
  - TS-01M0R1QK4DS2BZY3CSSHVT5GTT
  - TS-01M0R1QMZNEN451CGSSZGC2KPX
  - TS-01M0R1QPP5J6MBAN0CD82DBNS3
parent: TS-01M0R1JR37H6GZPSGHBT87H900
directories:
  - packages/features
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-uiux
---

Desktop and mobile must mount the same route tree from packages/features. Add a visual-parity check so layout/CSS Module class usage cannot diverge by app.

Acceptance: same screen set and look; app shells do not restyle feature screens.
