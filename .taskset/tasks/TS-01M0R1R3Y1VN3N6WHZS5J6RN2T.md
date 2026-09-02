---
id: TS-01M0R1R3Y1VN3N6WHZS5J6RN2T
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
  - TS-01M0R1JHED81QWBMSMG5X42E2S
parent: TS-01M0R1K0XW4W5R8WA2FH0QCPJS
directories:
  - apps/mobile
projects:
  - rahrow-mobile
---

Implement the Capacitor RahRowVpn plugin on Android with VpnService and an Xray userspace runtime. TypeScript stays at the plugin boundary.

Acceptance: connect/disconnect/status/diagnostics work on a device/emulator; core still owns profiles.
