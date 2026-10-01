---
id: 0000232-add-targeted-cleanup-to-subscription-and-local-group-menus
title: Add targeted cleanup to subscription and local-group menus
status: done
priority: high
risk: high
createdAt: 2026-09-01 22:38 UTC
updatedAt: 2026-09-01 23:29 UTC
labels:
  - cleanup
  - subscriptions
  - profiles
  - locked-connections
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
dependsOn:
  - 0000219-make-lock-state-an-invariant-for-cleanup-and-destructive-connection-acti
parent: 0000224-correct-shell-regressions-and-add-portable-backup-workflows
directories:
  - packages/features/src/profiles
  - packages/features/src/subscriptions
  - packages/core
  - apps/cli
projects:
  - rahrow-uiux
  - rahrow-core
---

Expose Cleanup in each subscription and local-group menu. Opening it preselects and scopes the existing cleanup drawer/command to that aggregate. Revalidate ownership and locks at execution time, skip locked descendants, state the skipped count, avoid affecting other groups, and keep CLI parity through an explicit group/subscription selector where cleanup exists.
