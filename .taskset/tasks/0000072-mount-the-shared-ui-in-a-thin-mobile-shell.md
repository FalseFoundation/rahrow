---
id: 0000072-mount-the-shared-ui-in-a-thin-mobile-shell
title: Mount the shared UI in a thin mobile shell
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:32 UTC
updatedAt: 2026-08-24 00:54 UTC
labels:
  - prod-v2
  - mobile
  - visual-parity
  - p0-blocker
dependsOn:
  - 0000043-build-identical-desktop-mobile-product-ui-in-packages-features
parent: 0000045-ship-a-production-mobile-client-around-the-shared-ui
directories:
  - apps/mobile
  - packages/features
projects:
  - rahrow-mobile
---

apps/mobile must mount the same packages/features shell as desktop. No mobile-only visual redesign.

Acceptance: in-app screens match desktop; Capacitor only supplies VPN, storage, clipboard, share, and camera.
