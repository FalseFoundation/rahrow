---
id: 063adb
title: Give icon-only actions consistent tooltip and focus semantics
status: done
priority: high
risk: medium
createdAt: 2026-09-01 21:13 UTC
updatedAt: 2026-09-01 22:15 UTC
labels:
  - cross-platform-hardening
  - tooltips
  - icon-actions
  - accessibility
  - touch
  - keyboard
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
parent: 04432a
directories:
  - packages/ui/src/components/ui
  - packages/features/src
projects:
  - rahrow-uiux
  - rahrow-cross-platform-hardening
---

## Work

Inventory icon-only action buttons in ProductHeader, drawer HStacks/headers/footers, lists, cards, Diagnostics, import/share, and settings. Build or compose one shared icon-action contract with a unique accessible name and shadcn Tooltip on hover and keyboard focus. Do not rely on title alone.

Touch devices do not have hover: keep actions visibly discoverable, preserve 44 CSS px targets, and expose the label through accessibility APIs; do not require a tooltip or long press to discover essential actions. Avoid tooltip/context-menu gesture conflicts, trapped focus, duplicate announcements, and tooltip display for disabled controls unless an accessible explanation is intentionally provided.

## Acceptance

A source/semantic contract identifies all icon-only actions; interaction tests cover pointer hover, focus-visible, keyboard activation, touch, disabled state, drawers, RTL, reduced motion, and screen readers on Android/iOS plus desktop shells. CLI is not applicable.
