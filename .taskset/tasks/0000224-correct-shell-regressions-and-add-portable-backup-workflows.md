---
id: 0000224-correct-shell-regressions-and-add-portable-backup-workflows
title: Correct shell regressions and add portable backup workflows
status: doing
priority: urgent
risk: high
createdAt: 2026-09-01 22:38 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - second-wave
  - cross-platform
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
parent: 0000203-harden-reported-behavior-across-every-rahrow-platform
directories:
  - packages
  - apps
projects:
  - rahrow-cross-platform-hardening
  - rahrow-uiux
  - rahrow-phase-03-product-state-and-data
---

## Objective

Coordinate the newly reported scroll, shell composition, backup/restore, QR, permission, cleanup, accessibility-copy, architecture, and advertising work across Android, iOS, macOS, Linux, Windows, and CLI.

## Execution order

1. Fix the active scroll regression and restore single-owner shell scrolling.
2. Restore UI-package composability and concise action labels.
3. Enable React Compiler with package-owned build checks.
4. Implement versioned backup security/domain behavior, then shared UI and host adapters.
5. Repair targeted cleanup, QR recognition, native permissions, and operation ad triggers.
6. Audit architecture boundaries and remove only evidence-proven dead weight.

## Cross-platform contract

Shared product behavior lives in packages/features and lower packages. Native shells only inject capabilities. UI-only behavior is verified in Android/iOS WebViews and desktop shells; CLI exposes equivalent domain commands where applicable. Unsupported native capabilities fail closed and are never simulated.

## Completion gate

All children need public-seam tests, platform evidence appropriate to risk, Taskset doctor/generate, affected package typechecks/tests, and installed-artifact validation for native claims.
