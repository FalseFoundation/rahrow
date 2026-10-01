---
id: 0000021-implement-qr-share-and-clipboard-import-export-flows
title: Implement QR share and clipboard import export flows
status: done
priority: medium
risk: medium
createdAt: 2026-08-21 23:31 UTC
updatedAt: 2026-08-22 02:18 UTC
labels:
  - phase-11
  - platform
  - import
  - export
  - qr
dependsOn:
  - 0000003-implement-import-pipeline-and-subscription-parsing
  - 0000006-implement-desktop-platform-integrations
parent: 0000009-build-connection-oriented-desktop-and-mobile-ux
directories:
  - apps/desktop
  - apps/mobile
projects:
  - rahrow
---

Implement QR encode/decode, clipboard import/export, and platform share flows so protocol logic remains entirely in serializers/parsers and platform layers only handle strings, camera/files, clipboard, or share sheets. Extract a reusable QR capability only if both desktop and mobile need the same non-platform logic. Completion requires malformed/unsupported input behavior and app tests around the flow boundaries.
