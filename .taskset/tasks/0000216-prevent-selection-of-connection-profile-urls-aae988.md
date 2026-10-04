---
id: aae988
title: Prevent selection of connection profile URLs
status: done
priority: medium
risk: low
createdAt: 2026-09-01 21:13 UTC
updatedAt: 2026-09-01 21:44 UTC
labels:
  - cross-platform-hardening
  - profiles
  - text-selection
  - privacy
  - interaction
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
related:
  - "591801"
parent: 04432a
directories:
  - packages/features/src/profiles
  - packages/ui/src
projects:
  - rahrow-uiux
  - rahrow-cross-platform-hardening
---

Remove the explicit selectable opt-in from profile connection/share URL text and keep those values nonselectable in cards, rows, details, and drawers unless they are inside a deliberate copy/export control. Preserve accessible reading and an explicit Copy action where product policy permits; do not expose credentials through selection, drag, tooltip, accessible name, or diagnostics.

Inputs/editors remain selectable and editable. Logs and intentionally copyable operational content retain their scoped opt-in. Test drag selection, long press/callout interaction, keyboard selection, RTL, mobile WebViews, and desktop shells. CLI output remains ordinary terminal text and is not governed by CSS selection.
