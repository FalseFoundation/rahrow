---
id: 0000204-eliminate-route-loading-stalls-and-standardize-screen-skeletons
title: Eliminate route loading stalls and standardize screen skeletons
status: done
priority: urgent
risk: high
createdAt: 2026-09-01 21:13 UTC
updatedAt: 2026-09-02 16:49 UTC
labels:
  - cross-platform-hardening
  - loading
  - skeletons
  - navigation
  - performance
  - regression
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
parent: 0000203-harden-reported-behavior-across-every-rahrow-platform
directories:
  - packages/features/src/app
  - packages/features/src/home
  - packages/features/src/profiles
  - packages/features/src/subscriptions
  - packages/features/src/settings
  - packages/features/src/diagnostics
  - packages/features/src/logs
  - packages/ui/src/components/ui
projects:
  - rahrow-uiux
  - rahrow-cross-platform-hardening
  - rahrow-phase-03-product-state-and-data
---

## Problem

Navigating between already-used pages can suddenly replace content with loading UI for roughly 30 seconds. Settings currently falls back to plain loading text while other screens use skeletons.

## Work

Instrument and reproduce route transitions on warm and cold navigation, slow storage/native capability reads, rejected or delayed lazy chunks, background refetch, app resume, and locale/theme changes. Distinguish TanStack Router/Suspense chunk loading from screen data loading; record start/end/cancel/error reasons and remove any unstable provider/callback identity that remounts routes or retriggers loads.

Keep prior usable screen data during background refresh. Reserve full-screen skeletons for initial load only; bound every pending state, provide error/retry behavior, cancel obsolete work on navigation, and never let a skeleton mask a rejected promise. Create one shared screen-loading contract using @rahrow/ui Skeleton, with shape-specific skeletons for Home, Connections, Subscriptions, Settings, Diagnostics, and Logs. Avoid content-layout shift and duplicate live-region announcements.

## Acceptance

Tests reproduce the reported navigation sequence and prove warm navigation does not show a full skeleton or wait on unrelated 30-second work. Initial loading, background refresh, error, retry, route cancellation, offline, app resume, RTL, reduced motion, and slow native capability probes are covered. Verify Android/iOS WebViews and macOS/Windows/Linux shells; CLI is not applicable to visual skeletons.
