---
id: TS-01M1G3RCEM53ZCMBZ7BDC9FMCQ
title: Move the power-control ripple outside its backlight
status: todo
priority: medium
risk: medium
createdAt: 2026-09-02 03:49 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - home
  - power-control
  - ripple
  - backlight
  - motion
  - ui
related:
  - TS-01M1A8DW05SXPM1X974A6V65ET
parent: TS-01M1AP3W0V9EAG00WX8M1CEVP7
directories:
  - packages/features/src/home
  - packages/ui/src/components/ui
projects:
  - rahrow-uiux
  - rahrow-phase-02-light-ui-and-copy
---

Recompose the Home power control so Ripple renders outside and around the Backlight boundary instead of being clipped or visually contained inside it. Keep the button hit target, focus ring, state semantics, stacking context, pointer behavior, blue connected-only treatment, and surrounding layout stable.

Acceptance covers disconnected, connecting, connected, disconnecting, error, pressed, focus-visible, light/dark, reduced motion, high zoom, mobile safe areas, and desktop.
