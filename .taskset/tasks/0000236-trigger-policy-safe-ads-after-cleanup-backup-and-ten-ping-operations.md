---
id: 0000236-trigger-policy-safe-ads-after-cleanup-backup-and-ten-ping-operations
title: Trigger policy-safe ads after cleanup backup and ten ping operations
status: done
priority: high
risk: high
createdAt: 2026-09-01 22:39 UTC
updatedAt: 2026-09-01 23:50 UTC
labels:
  - ads
  - cleanup
  - backup-restore
  - latency
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
dependsOn:
  - 0000232-add-targeted-cleanup-to-subscription-and-local-group-menus
  - 0000235-build-the-shared-backup-import-and-export-drawer-flow
related:
  - 0000195-implement-persistent-ad-obligation-state-machine
parent: 0000224-correct-shell-regressions-and-add-portable-backup-workflows
directories:
  - packages/ads
  - packages/features/src/ads
  - packages/features/src/profiles
  - packages/features/src/subscriptions
  - packages/features/src/backup
projects:
  - rahrow-uiux
  - rahrow-core
---

Feed the existing ad obligation state machine with successful cleanup, successful backup export/import, and every tenth completed ping operation. One profile ping counts one; one subscription ping action counts one regardless of child count. Failed, cancelled, permission-denied, or no-op operations do not count. Persist and serialize counters, prevent duplicate events across rerenders/retries, respect platform policy/capability gates, and keep ad SDK concerns outside core/features. CLI records domain events only where the existing ad policy applies and never renders an ad.
