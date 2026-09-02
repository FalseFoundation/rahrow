---
id: TS-01M12802Q8B03PA8BWSQZYEBWR
title: Replace Android VPN skeleton with native engine providers
status: blocked
priority: urgent
risk: high
createdAt: 2026-08-27 18:33 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - vpn
  - android
  - native-engine
  - p0-release-blocker
dependsOn:
  - TS-01M12801K77WAFWMPP45EM4YXM
  - TS-01M11NT06C3NAK1A9B53E7A2QZ
  - TS-01M128045RHED9ECJX7XEGYSXM
parent: TS-01M11V0TEC0X5B397WT2ERJA3W
directories:
  - apps/mobile/android
  - apps/mobile/src
projects:
  - rahrow-production
  - rahrow-phase-04-native-runtime-and-capabilities
---

The unsafe subprocess/SOCKS skeleton was replaced with engine-specific VpnService processes, JNI/TUN ownership, protected upstreams, full IPv4/IPv6 routes and DNS, permission/revocation handling, cross-process status, locking, bounded lifecycle acknowledgement, teardown, and fail-closed diagnostics. Single-application acceptance requires every advertised ABI library, engine provider, and asset inside the RahRow APK/AAB, installed and removed only with RahRow, with no companion app, package, runtime download, or user-installed core. Completion remains blocked on built embedded JNI/AAR providers, licensing approval, Android compilation, and installed-device lifecycle/leak tests.
