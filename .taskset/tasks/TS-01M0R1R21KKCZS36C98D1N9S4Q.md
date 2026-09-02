---
id: TS-01M0R1R21KKCZS36C98D1N9S4Q
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
  - TS-01M0R1JR37H6GZPSGHBT87H900
parent: TS-01M0R1K0XW4W5R8WA2FH0QCPJS
directories:
  - apps/mobile
  - packages/features
projects:
  - rahrow-mobile
---

apps/mobile must mount the same packages/features shell as desktop. No mobile-only visual redesign.

Acceptance: in-app screens match desktop; Capacitor only supplies VPN, storage, clipboard, share, and camera.
