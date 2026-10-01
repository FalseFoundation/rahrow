---
id: 0000066-build-shared-diagnostics-and-settings-screens
title: Build shared Diagnostics and Settings screens
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
  - 0000053-expand-settings-for-routing-mode-ports-and-ui-preferences
parent: 0000043-build-identical-desktop-mobile-product-ui-in-packages-features
directories:
  - packages/features
projects:
  - rahrow-uiux
---

Diagnostics: engine status, last error, latency, native capability support. Settings: port, engine, routing mode, proxy/autostart flags, theme.

Acceptance: identical screens; capabilities are injected; unsupported native flags render as explicit states.
