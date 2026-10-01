---
id: 0000022-reduce-shared-ui-to-product-needed-primitives
title: Reduce shared UI to product-needed primitives
status: done
priority: medium
risk: medium
createdAt: 2026-08-21 23:32 UTC
updatedAt: 2026-08-22 01:24 UTC
labels:
  - phase-11
  - ui
  - cleanup
dependsOn:
  - 0000011-finish-migration-cleanup-and-dependency-graph-enforcement
parent: 0000009-build-connection-oriented-desktop-and-mobile-ux
directories:
  - packages/ui
projects:
  - rahrow
---

Align @rahrow/ui with the plan by keeping only primitives and tokens needed by the desktop/mobile product flows. Remove or defer the broad catalog of unused components, keep app-specific composed widgets inside apps, and ensure consumers import stable package exports. Completion requires no generated/cache hand edits, package README update if ownership changes, and UI package typecheck/build validation.
