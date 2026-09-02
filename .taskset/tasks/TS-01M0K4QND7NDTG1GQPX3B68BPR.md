---
id: TS-01M0K4QND7NDTG1GQPX3B68BPR
title: Implement mobile VPN platform boundary
status: done
priority: medium
risk: high
createdAt: 2026-08-21 21:48 UTC
updatedAt: 2026-08-22 02:00 UTC
labels:
  - phase-9
  - mobile
dependsOn:
  - TS-01M0K4Q9JGNZ65EZT3EG1KX9SQ
  - TS-01M0K4Q9JNV1BJYDXYBWY9Y1KE
directories:
  - apps/mobile
projects:
  - rahrow
---

Add Capacitor-facing Android VPN and iOS Network Extension boundaries when native requirements are known. Expose only necessary TypeScript operations and keep business logic in core.
