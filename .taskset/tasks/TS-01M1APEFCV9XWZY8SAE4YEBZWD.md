---
id: TS-01M1APEFCV9XWZY8SAE4YEBZWD
title: Split feature routes and enforce initial bundle budgets
status: done
priority: high
risk: medium
createdAt: 2026-08-31 01:20 UTC
updatedAt: 2026-08-31 01:29 UTC
labels:
  - performance
  - bundles
  - ui
parent: TS-01M1AMFA17C96Z6VRNRGDP6KAW
directories:
  - packages/features/src/app
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-uiux
---

Test and implement lazy route boundaries plus lazy Share/QR loading, scope startup work, establish realistic desktop/mobile initial gzip budgets, and preserve user-visible loading/error recovery without changing colors.
