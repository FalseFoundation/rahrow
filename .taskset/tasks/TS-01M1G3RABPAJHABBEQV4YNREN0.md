---
id: TS-01M1G3RABPAJHABBEQV4YNREN0
title: Support deliberate touch-hold hints without duplicate WebView tooltips
status: todo
priority: high
risk: high
createdAt: 2026-09-02 03:49 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - tooltip
  - touch
  - accessibility
  - base-ui
  - shadcn
  - platform-android
  - platform-ios
  - platform-desktop
related:
  - TS-01M1FD3GGXZENPMMD5XRFY9EKA
  - TS-01M1FJ04DDX00JCYDAKGGXZDRY
parent: TS-01M1AM68XJ5G8CNBTBZ84C12EM
directories:
  - packages/ui/src/components/ui
  - packages/features/src
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-uiux
  - rahrow-cross-platform-hardening
  - rahrow-phase-01-idea-and-research
---

Base UI documents Tooltip as hover/focus only, disables it for touch because long press conflicts with browser context menus, and requires a separate accessible name on the trigger. shadcn delegates its Base UI Tooltip API to that contract. Research and implement a RahRow-owned deliberate touch-hold hint only where it does not conflict with row context menus, scrolling, activation, selection, or OS callouts; use a Popover or another explicit accessible affordance when Tooltip is the wrong primitive.

Keep aria-label or equivalent accessible naming for icon-only controls. Remove redundant title attributes or suppress only duplicate native WebView title bubbles in Tauri and Capacitor. Do not suppress accessibility APIs. Acceptance covers mouse hover, keyboard focus, touch hold/cancel/move, activation after hold, Android WebView, iOS WKWebView, desktop WebViews, TalkBack, VoiceOver, RTL, and reduced motion.

Research sources:
- https://base-ui.com/react/components/tooltip
- https://ui.shadcn.com/docs/components/base/tooltip
