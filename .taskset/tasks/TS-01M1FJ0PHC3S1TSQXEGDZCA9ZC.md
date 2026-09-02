---
id: TS-01M1FJ0PHC3S1TSQXEGDZCA9ZC
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
  - TS-01M1FJ04F7A36JWTH6Y2DDPG9Q
  - TS-01M1FJ0P69C726J6PAZV26M3DZ
related:
  - TS-01M1C052F3MHT7QHV95QKT0QK6
parent: TS-01M1FHYT7403GRGB8AEVAGCA5S
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
