---
id: TS-01M12803GWY4K1H9QSHSRH0H5Y
title: Implement Linux TUN service and package authorization
status: blocked
priority: urgent
risk: high
createdAt: 2026-08-27 18:33 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - vpn
  - linux
  - service
  - p0-release-blocker
dependsOn:
  - TS-01M12801K77WAFWMPP45EM4YXM
parent: TS-01M11V0TEC0X5B397WT2ERJA3W
directories:
  - apps/desktop
  - engines
  - .github/workflows
projects:
  - rahrow-production
  - rahrow-phase-04-native-runtime-and-capabilities
---

The versioned bounded Start/Stop/Status IPC contract and fail-closed release gates exist. Single-application acceptance requires each RahRow Linux application package to contain its TUN service, polkit policy, selected engines, assets, notices, and authenticated IPC support. The package must install, authorize, upgrade, and remove those nested components as one RahRow product, without asking users to separately install engine packages, services, scripts, language runtimes, or PATH tools. Blocked on the real service, polkit and Unix peer authorization, bounded CAP_NET_ADMIN route/DNS ownership, deb/rpm integration, cleanup, and installed Linux VM evidence.
