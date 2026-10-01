---
id: 0000065-build-shared-import-qr-clipboard-and-share-flows
title: Build shared Import, QR, clipboard, and share flows
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:32 UTC
updatedAt: 2026-08-23 22:21 UTC
labels:
  - prod-v2
  - ux
  - css-modules
  - p1-product
dependsOn:
  - 0000060-establish-shared-feature-screens-and-css-modules-convention
parent: 0000043-build-identical-desktop-mobile-product-ui-in-packages-features
directories:
  - packages/features
  - packages/ui
projects:
  - rahrow-uiux
---

Import/export must converge on the protocol pipeline. QR encoding should produce a scannable image, not a JSON text dump. Clipboard and share are capability transports.

Acceptance: URL, clipboard, QR, share, subscription, and manual input all produce ConnectionProfile; desktop QR decode can remain explicitly unsupported until a camera/file decoder exists.
