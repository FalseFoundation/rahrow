---
id: a0da13
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
  - e09c0b
  - 1ae453
directories:
  - apps/mobile
projects:
  - rahrow
---

Add Capacitor-facing Android VPN and iOS Network Extension boundaries when native requirements are known. Expose only necessary TypeScript operations and keep business logic in core.
