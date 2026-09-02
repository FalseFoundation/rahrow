---
id: TS-01M0R1RDSYECMEK72JJTNAMAKA
title: Add desktop/mobile visual-parity and cross-interface tests
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:32 UTC
updatedAt: 2026-08-24 01:04 UTC
labels:
  - prod-v2
  - testing
  - visual-parity
  - p0-blocker
dependsOn:
  - TS-01M0R1JR37H6GZPSGHBT87H900
  - TS-01M0R1K2XMD88TE4ZYAS1M6J8N
parent: TS-01M0R1K550RG24K2062ZSJXCEF
directories:
  - packages/features
  - tests
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-testing
---

Prove desktop and mobile mount the same feature screens/CSS Modules and that CLI/desktop/mobile share core contracts.

Acceptance: a regression fails if an app introduces a unique product screen or restyles shared features.
