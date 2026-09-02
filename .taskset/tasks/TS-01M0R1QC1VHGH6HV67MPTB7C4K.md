---
id: TS-01M0R1QC1VHGH6HV67MPTB7C4K
title: Establish shared feature screens and CSS Modules convention
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:31 UTC
updatedAt: 2026-08-23 22:20 UTC
labels:
  - prod-v2
  - ui
  - css-modules
  - visual-parity
  - p0-blocker
parent: TS-01M0R1JR37H6GZPSGHBT87H900
directories:
  - packages/features
  - packages/ui
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-uiux
---

Move product UI into packages/features. Colocate Component.module.css with every feature component. Apps become thin shells that mount the shared shell and inject capabilities.

Acceptance: desktop and mobile render the same screens; no duplicated ProfileManagement screens; CSS Modules are the feature styling rule; @rahrow/ui is primitives only.
