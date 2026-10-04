---
id: 84112f
title: Suppress ads for five minutes after a completed view
status: done
priority: urgent
risk: high
createdAt: 2026-09-01 23:59 UTC
updatedAt: 2026-09-02 00:10 UTC
labels:
  - ads
  - cooldown
  - privacy
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
parent: "665301"
directories:
  - packages/ads
  - packages/features/src/ads
  - apps/mobile
  - apps/desktop
projects:
  - rahrow-ads
  - rahrow-cross-platform-hardening
---

Persist the timestamp of the last successfully completed ad view and refuse new claims/presentation for five minutes. Pending, failed, dismissed-before-completion, cancelled, unsupported, or no-fill attempts do not start the cooldown. Re-check immediately before presentation to prevent concurrent claims, survive restart and clock rollback safely, preserve queued obligations without ad storms, and keep CLI presenter-free.
