---
id: TS-01M0R1JR37H6GZPSGHBT87H900
title: Build identical desktop/mobile product UI in packages/features
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:29 UTC
updatedAt: 2026-08-23 22:21 UTC
labels:
  - prod-v2
  - ui
  - ux
  - css-modules
  - visual-parity
  - p0-blocker
dependsOn:
  - TS-01M0R1J88162KKWAMHX36EBWP1
  - TS-01M0R1JARRXY042TNG6TA5R2JS
related:
  - TS-01M0QTRG8AKNY9FW586E2X19BM
parent: TS-01M0R1ANJXZV14BYG8SPA1T90P
directories:
  - packages/features
  - packages/ui
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-uiux
---

Epic: desktop and mobile must look exactly alike.

Shared screens, routes, layout, typography, spacing, and feature composition live in packages/features with colocated CSS Modules. @rahrow/ui owns primitives/tokens. apps/desktop and apps/mobile are thin shells.

Required screens: Home, Profiles, Subscriptions, Import, Diagnostics, Settings.
Home must include Connect/Disconnect, current profile, connection state, and latency.

Acceptance: no duplicated product screens; no per-app visual design; feature files use Component.module.css; visual parity is testable.
