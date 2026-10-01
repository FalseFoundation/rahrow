---
id: 0000078-add-desktop-mobile-visual-parity-and-cross-interface-tests
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
  - 0000043-build-identical-desktop-mobile-product-ui-in-packages-features
  - 0000046-make-the-cli-a-production-automation-surface
parent: 0000047-prove-production-behavior-with-automated-tests
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
