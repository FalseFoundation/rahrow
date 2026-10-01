---
id: 0000036-refine-desktop-and-mobile-product-ux
title: Refine desktop and mobile product UX
status: done
priority: medium
risk: medium
createdAt: 2026-08-23 17:30 UTC
updatedAt: 2026-08-23 19:03 UTC
labels:
  - prod-grade
  - ui
  - desktop
  - mobile
  - p1-hardening
dependsOn:
  - 0000029-harden-import-export-and-subscription-pipelines
  - 0000030-make-storage-production-safe
  - 0000033-implement-production-desktop-native-integrations
  - 0000034-implement-production-mobile-vpn-bridge-plan
parent: 0000025-make-rahrow-production-grade
directories:
  - apps/desktop
  - apps/mobile
  - packages/ui
projects:
  - rahrow-interfaces
---

Refine the main product experience once core and native prerequisites are in place. Acceptance: Home, Profiles, Subscriptions, Import, Diagnostics, and Settings are complete, accessible, responsive, use @rahrow/ui, and keep local UI state separate from shared application/domain state.
