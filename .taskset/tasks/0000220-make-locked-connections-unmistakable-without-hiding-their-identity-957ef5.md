---
id: 957ef5
title: Make locked connections unmistakable without hiding their identity
status: done
priority: high
risk: medium
createdAt: 2026-09-01 21:20 UTC
updatedAt: 2026-09-02 17:14 UTC
labels:
  - cross-platform-hardening
  - connections
  - locking
  - icons
  - accessibility
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
dependsOn:
  - d3aee5
related:
  - 4a1ef1
  - 87d9a4
parent: 04432a
directories:
  - packages/features/src/profiles
  - packages/features/src/subscriptions
  - packages/ui/src/components
  - apps/cli
projects:
  - rahrow-uiux
  - rahrow-cross-platform-hardening
  - rahrow-phase-02-light-ui-and-copy
---

## Presentation contract

Show lock state consistently on subscription groups, profile groups, subscription rows, and profile rows. Preserve source/type identity: do not replace every cloud/provider/protocol icon with a lock if that makes ownership ambiguous. Prefer a dedicated lock status accessory/badge or a documented composite icon; use a full lock icon replacement only where the original icon carries no other meaning.

The indicator needs visible text or an accessible name such as Locked, adequate contrast, RTL-safe placement, and a tooltip on hover/focus. It must remain visible at narrow widths, high zoom, touch layouts, selected/connected states, virtualized rows, and inside action drawers. Do not communicate lock state by color alone.

Destructive or source-mutating actions must be hidden or disabled according to the shared lock policy with a concise explanation and explicit Unlock action. Long press, context menu, overflow menu, keyboard, and screen-reader paths must expose the same state and action set.

## Acceptance

Tests cover all lockable aggregate shapes, parent-derived locks, dynamic lock/unlock, search/sort/virtualization, Android/iOS touch and TalkBack/VoiceOver, macOS/Linux/Windows hover/keyboard, RTL, and CLI list/show status.
