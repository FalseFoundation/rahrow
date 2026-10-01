---
id: 0000075-implement-mobile-camera-qr-import
title: Implement mobile camera QR import
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:32 UTC
updatedAt: 2026-08-24 00:54 UTC
labels:
  - prod-v2
  - mobile
  - ux
  - p1-product
dependsOn:
  - 0000065-build-shared-import-qr-clipboard-and-share-flows
  - 0000072-mount-the-shared-ui-in-a-thin-mobile-shell
parent: 0000045-ship-a-production-mobile-client-around-the-shared-ui
directories:
  - apps/mobile
  - packages/features
projects:
  - rahrow-mobile
---

Provide a camera QR decoder capability to the shared Import feature. Decoding returns a string; protocol parsing stays in core.

Acceptance: scanned VLESS/VMess/Trojan/subscription payloads enter the shared import pipeline.
