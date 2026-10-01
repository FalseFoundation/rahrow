---
id: 0000037-add-production-checks
title: Add production checks
status: done
priority: high
risk: high
createdAt: 2026-08-23 17:30 UTC
updatedAt: 2026-08-23 19:09 UTC
labels:
  - prod-grade
  - testing
  - ci
  - p0-release-blocker
dependsOn:
  - 0000027-harden-core-domain-and-profile-validation
  - 0000028-complete-protocol-compatibility-matrix
  - 0000029-harden-import-export-and-subscription-pipelines
  - 0000030-make-storage-production-safe
  - 0000031-finalize-proxyengine-contract-and-future-engine-seam
  - 0000032-harden-xray-config-builder-and-runtime-process-lifecycle
  - 0000033-implement-production-desktop-native-integrations
  - 0000034-implement-production-mobile-vpn-bridge-plan
  - 0000035-finalize-cli-as-production-automation-surface
  - 0000036-refine-desktop-and-mobile-product-ux
parent: 0000025-make-rahrow-production-grade
directories:
  - tests
  - apps
  - packages
projects:
  - rahrow-release
---

Add production checks. Acceptance: CI runs lint, typecheck, Vitest, architecture tests, package builds, desktop web build, mobile web build, and selected runtime smoke tests.
