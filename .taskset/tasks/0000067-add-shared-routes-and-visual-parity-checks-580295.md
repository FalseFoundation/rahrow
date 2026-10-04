---
id: "580295"
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
  - 4fee4d
  - e356f6
  - 48a9d9
  - 95c8ed
  - 7fba76
parent: a27174
directories:
  - packages/features
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-uiux
---

Desktop and mobile must mount the same route tree from packages/features. Add a visual-parity check so layout/CSS Module class usage cannot diverge by app.

Acceptance: same screen set and look; app shells do not restyle feature screens.
