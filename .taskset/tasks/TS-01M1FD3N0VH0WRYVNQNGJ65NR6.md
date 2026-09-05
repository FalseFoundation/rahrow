---
id: TS-01M1FD3N0VH0WRYVNQNGJ65NR6
title: Open connection item actions by researched long press and context menu
status: done
priority: high
risk: medium
createdAt: 2026-09-01 21:13 UTC
updatedAt: 2026-09-02 16:49 UTC
labels:
  - cross-platform-hardening
  - long-press
  - context-menu
  - connections
  - accessibility
  - research-backed
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
parent: TS-01M1FCY8ZHNE0E843BHX893G1F
files:
  - docs/research/long-press-context-menus.md
directories:
  - packages/features/src/profiles
  - packages/features/src/subscriptions
  - packages/ui/src/components/ui
  - apps/mobile
projects:
  - rahrow-uiux
  - rahrow-cross-platform-hardening
  - rahrow-phase-02-light-ui-and-copy
---

Use docs/research/long-press-context-menus.md as the implementation contract. Wrap subscription groups, profile groups, subscriptions, and profiles with RahRow's installed shadcn Base UI ContextMenu; do not add a Radix-specific or custom timer hook.

Preserve Base UI 1.7.0's 500 ms single-touch hold and over-10-CSS-px per-axis cancellation, touchend/touchcancel/multitouch/unmount cleanup, native contextmenu handling, and scrolling. A successful hold must not also activate/select the row. Share one action model with the existing visible labeled overflow Menu button so keyboard and assistive-tech users never depend on long press. Preserve focus return, Escape/arrows/typeahead, RTL, destructive confirmations, virtualized row recycling, and optional haptics only through a mobile capability.

Test mouse secondary click, keyboard/menu key, touch hold/cancel/scroll, Android WebView, iOS WKWebView, macOS WKWebView, Windows WebView2, Linux WebKitGTK, VoiceOver, and TalkBack. CLI has no pointer UI but retains equivalent commands where actions are product capabilities.
