---
id: TS-01M1FJ04CBJQVET5X6NW77BT5P
title: Stop unsolicited scroll resets and establish one app-shell scroll owner
status: done
priority: urgent
risk: high
createdAt: 2026-09-01 22:38 UTC
updatedAt: 2026-09-01 22:50 UTC
labels:
  - scroll-regression
  - app-shell
  - responsive-layout
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
related:
  - TS-01M1FD3NZ72RNAGDVDW27XN9RD
parent: TS-01M1FHYT7403GRGB8AEVAGCA5S
directories:
  - packages/features/src/app
  - packages/ui/src
  - apps/desktop/src
  - apps/mobile/src
projects:
  - rahrow-uiux
  - rahrow-cross-platform-hardening
---

## Behavior seam

At the rendered AppShell boundary, ordinary rerenders, background state updates, and user scrolling must never reset the active route scroll position. Eliminate document/body scrolling and the short-viewport min-height overflow so there is exactly one bounded scroll owner. Make the tab bar a static flex/grid row rather than a fixed overlay, remove compensating bottom padding, preserve safe areas, and keep all final content reachable.

## Verification

Add regression contracts for document overflow, short viewport sizing, one scroll owner, static navigation, and reachable content. Audit effects, keys, autofocus, focus restoration, virtualization anchoring, and remounts for unintended scroll writes. Verify short and normal desktop/mobile viewport classes.
