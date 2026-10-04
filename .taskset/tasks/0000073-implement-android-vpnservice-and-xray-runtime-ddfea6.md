---
id: ddfea6
title: Implement Android VPNService and Xray runtime
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:32 UTC
updatedAt: 2026-08-24 00:54 UTC
labels:
  - prod-v2
  - mobile
  - vpn
  - native
  - p0-blocker
dependsOn:
  - 761c27
parent: 8d52d4
directories:
  - apps/mobile
projects:
  - rahrow-mobile
---

Implement the Capacitor RahRowVpn plugin on Android with VpnService and an Xray userspace runtime. TypeScript stays at the plugin boundary.

Acceptance: connect/disconnect/status/diagnostics work on a device/emulator; core still owns profiles.
