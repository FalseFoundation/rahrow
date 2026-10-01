---
id: 0000263-move-the-power-control-ripple-outside-its-backlight
title: Move the power-control ripple outside its backlight
status: done
priority: medium
risk: medium
createdAt: 2026-09-02 03:49 UTC
updatedAt: 2026-09-02 16:48 UTC
labels:
  - home
  - power-control
  - ripple
  - backlight
  - motion
  - ui
related:
  - 0000138-polish-shared-connection-ui-drawers-and-neutral-blue-theme
parent: 0000174-keep-the-connected-app-neutral-except-for-the-blue-power-control
directories:
  - packages/features/src/home
  - packages/ui/src/components/ui
projects:
  - rahrow-uiux
  - rahrow-phase-02-light-ui-and-copy
---

Recompose the Home power control so Ripple renders outside and around the Backlight boundary instead of being clipped or visually contained inside it. Keep the button hit target, focus ring, state semantics, stacking context, pointer behavior, blue connected-only treatment, and surrounding layout stable.

Acceptance covers disconnected, connecting, connected, disconnecting, error, pressed, focus-visible, light/dark, reduced motion, high zoom, mobile safe areas, and desktop.
