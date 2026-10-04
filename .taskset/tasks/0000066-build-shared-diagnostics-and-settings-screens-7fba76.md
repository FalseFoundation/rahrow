---
id: 7fba76
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
  - 33ec61
  - d04219
parent: a27174
directories:
  - packages/features
projects:
  - rahrow-uiux
---

Diagnostics: engine status, last error, latency, native capability support. Settings: port, engine, routing mode, proxy/autostart flags, theme.

Acceptance: identical screens; capabilities are injected; unsupported native flags render as explicit states.
