---
id: TS-01M0KANH6AF4NC3CMSR4P3D2SD
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
  - TS-01M0KAKDEVCKFS22FFQHFC9QA5
parent: TS-01M0K4R0P3FQGX31SSNK552055
directories:
  - packages/ui
projects:
  - rahrow
---

Align @rahrow/ui with the plan by keeping only primitives and tokens needed by the desktop/mobile product flows. Remove or defer the broad catalog of unused components, keep app-specific composed widgets inside apps, and ensure consumers import stable package exports. Completion requires no generated/cache hand edits, package README update if ownership changes, and UI package typecheck/build validation.
