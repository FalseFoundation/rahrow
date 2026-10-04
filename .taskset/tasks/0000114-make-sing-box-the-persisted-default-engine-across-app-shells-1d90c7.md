---
id: 1d90c7
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
  - 02455e
parent: e1b2fd
directories:
  - packages/core
  - packages/engine
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-production
---

Make sing-box the default selected engine for fresh and migrated settings across desktop and mobile while retaining VPN TUN as the default connection mode. Keep fail-closed native tunnel capability checks, do not silently fall back to proxy, and add migration and cross-interface tests.
