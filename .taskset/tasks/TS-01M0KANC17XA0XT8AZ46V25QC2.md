---
id: TS-01M0KANC17XA0XT8AZ46V25QC2
title: Implement QR share and clipboard import export flows
status: todo
priority: medium
risk: medium
createdAt: 2026-08-21 23:31 UTC
updatedAt: 2026-08-21 23:31 UTC
labels:
  - phase-11
  - platform
  - import
  - export
  - qr
dependsOn:
  - TS-01M0K4Q9JK7MQFS53BBBWHYMVX
  - TS-01M0K4QFG0Z01XS9KFS1FYZG5W
parent: TS-01M0K4R0P3FQGX31SSNK552055
directories:
  - apps/desktop
  - apps/mobile
projects:
  - rahrow
---

Implement QR encode/decode, clipboard import/export, and platform share flows so protocol logic remains entirely in serializers/parsers and platform layers only handle strings, camera/files, clipboard, or share sheets. Extract a reusable QR capability only if both desktop and mobile need the same non-platform logic. Completion requires malformed/unsupported input behavior and app tests around the flow boundaries.
