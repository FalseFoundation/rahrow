---
id: TS-01M17F429ZTDTPD2KXH1ZW45D3
title: Make sing-box the persisted default engine across app shells
status: done
priority: urgent
risk: high
createdAt: 2026-08-29 19:14 UTC
updatedAt: 2026-08-29 19:18 UTC
labels:
  - engine
  - settings
  - vpn
dependsOn:
  - TS-01M11V0TEC0X5B397WT2ERJA3W
parent: TS-01M0ZN2HRE96PN6HY45XKQYM7N
directories:
  - packages/core
  - packages/engine
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-production
---

Make sing-box the default selected engine for fresh and migrated settings across desktop and mobile while retaining VPN TUN as the default connection mode. Keep fail-closed native tunnel capability checks, do not silently fall back to proxy, and add migration and cross-interface tests.
