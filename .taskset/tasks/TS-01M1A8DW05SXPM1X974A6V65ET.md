---
id: TS-01M1A8DW05SXPM1X974A6V65ET
title: Polish shared connection UI, drawers, and neutral-blue theme
status: done
priority: high
createdAt: 2026-08-30 21:15 UTC
updatedAt: 2026-08-30 21:42 UTC
labels:
  - ui
  - polish
files:
  - apps/desktop/src-tauri/tauri.conf.json
directories:
  - packages/ui
  - packages/features
---

Goal: restore one coherent mobile-width RahRow UI across desktop and mobile.\n\nAcceptance:\n- Profile endpoint renders as host:port with truncation.\n- All modal and destructive approval flows use accessible swipe-handle Drawers.\n- Every action drawer pins its final actions in DrawerFooter at the bottom.\n- Subscription source, profile count/update time, quota, total, and expiry have clear spacing and hierarchy.\n- Export/share drawer is polished and exported content uses HyperText.\n- NumberTicker animates latency/ping and speed values; MorphingText is used only for suitable loading states.\n- The centered power button uses Ripple and an optional restrained Backlight.\n- NumberTicker, HyperText, MorphingText, Ripple, and Backlight live in packages/ui.\n- Exact requested neutral oklch light/dark Shadcn palette is the default; connected primary is an oklch blue equivalent to #4361ee; old yellow/green state colors are removed.\n- Shared design tokens serve both themes and component-specific raw colors are avoided.\n- Default radius is 0.875rem and oversized non-circular radii are reduced one level.\n- Shared app content never exceeds a standard mobile width; desktop defines minimum window width and height.\n- Long URLs and compact content truncate safely.\n- Diagnostics/log data tables use custom horizontal ScrollArea.\n- Existing Shadcn primitives replace native form/display markup where appropriate.\n- Home no longer says RAHROW · SELECTED.\n- Settings and all root pages use consistent gaps, padding, safe areas, and bottom spacing.\n- Standalone and subscription profile groups are collapsible.\n- Desktop/mobile shared UI remains in packages/features and primitives/tokens remain in packages/ui.\n- Scoped tests, typechecks, root checks, diff checks, and visual QA pass.
