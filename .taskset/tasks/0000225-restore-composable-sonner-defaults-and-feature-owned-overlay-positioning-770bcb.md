---
id: 770bcb
title: Restore composable Sonner defaults and feature-owned overlay positioning
status: done
priority: urgent
risk: medium
createdAt: 2026-09-01 22:38 UTC
updatedAt: 2026-09-01 22:48 UTC
labels:
  - sonner
  - overlays
  - composability
  - data-attributes
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
parent: bf02bf
directories:
  - packages/ui/src/components/ui
  - packages/features/src/app
projects:
  - rahrow-uiux
  - rahrow-cross-platform-hardening
---

## Behavior seam

@rahrow/ui owns a standalone top-positioned Sonner primitive with no dependency on app header/drawer orchestration. Feature composition records overlay state on the document body (for example data-drawer-open) and supplies app-specific offsets through stable CSS/custom-property or provider composition. With no drawer, toasts clear the main header; with a drawer, they use the top edge.

Remove UI-to-feature coupling introduced by the earlier overlay layout implementation. Preserve multi-drawer correctness, cleanup on unmount, safe-area handling, SSR guards, and reduced-motion behavior.
