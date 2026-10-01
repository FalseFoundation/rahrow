---
id: 0000068-mount-the-shared-ui-in-a-thin-desktop-shell
title: Mount the shared UI in a thin desktop shell
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:32 UTC
updatedAt: 2026-08-23 22:21 UTC
labels:
  - prod-v2
  - desktop
  - visual-parity
  - p0-blocker
dependsOn:
  - 0000043-build-identical-desktop-mobile-product-ui-in-packages-features
parent: 0000044-ship-a-production-desktop-client-around-the-shared-ui
directories:
  - apps/desktop
  - packages/features
projects:
  - rahrow-desktop
---

apps/desktop must mount packages/features, inject Tauri capabilities, and keep no product layout of its own.

Acceptance: deleting app-local screens does not remove product UI; desktop looks like mobile.
