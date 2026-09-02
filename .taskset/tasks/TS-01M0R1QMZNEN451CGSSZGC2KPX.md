---
id: TS-01M0R1QMZNEN451CGSSZGC2KPX
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
  - TS-01M0R1QC1VHGH6HV67MPTB7C4K
parent: TS-01M0R1JR37H6GZPSGHBT87H900
directories:
  - packages/features
  - packages/ui
projects:
  - rahrow-uiux
---

Import/export must converge on the protocol pipeline. QR encoding should produce a scannable image, not a JSON text dump. Clipboard and share are capability transports.

Acceptance: URL, clipboard, QR, share, subscription, and manual input all produce ConnectionProfile; desktop QR decode can remain explicitly unsupported until a camera/file decoder exists.
