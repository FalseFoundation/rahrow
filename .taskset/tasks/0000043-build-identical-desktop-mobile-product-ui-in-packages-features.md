---
id: 0000043-build-identical-desktop-mobile-product-ui-in-packages-features
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
  - 0000040-complete-core-domain-protocols-and-settings
  - 0000041-replace-in-memory-app-stores-with-durable-persistence
related:
  - 0000036-refine-desktop-and-mobile-product-ux
parent: 0000039-ship-rahrow-as-a-production-v2ray-xray-client
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
