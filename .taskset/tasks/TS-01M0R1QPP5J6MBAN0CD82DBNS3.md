---
id: TS-01M0R1QPP5J6MBAN0CD82DBNS3
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
  - TS-01M0R1QC1VHGH6HV67MPTB7C4K
  - TS-01M0R1KV6VG4SV470Z37W83FN0
parent: TS-01M0R1JR37H6GZPSGHBT87H900
directories:
  - packages/features
projects:
  - rahrow-uiux
---

Diagnostics: engine status, last error, latency, native capability support. Settings: port, engine, routing mode, proxy/autostart flags, theme.

Acceptance: identical screens; capabilities are injected; unsupported native flags render as explicit states.
