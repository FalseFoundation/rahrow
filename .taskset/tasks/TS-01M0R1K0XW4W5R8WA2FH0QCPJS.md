---
id: TS-01M0R1K0XW4W5R8WA2FH0QCPJS
title: Ship a production mobile client around the shared UI
status: doing
priority: high
risk: high
createdAt: 2026-08-23 19:29 UTC
updatedAt: 2026-09-02 03:51 UTC
labels:
  - prod-v2
  - mobile
  - native
  - vpn
  - p0-blocker
dependsOn:
  - TS-01M0R1JHED81QWBMSMG5X42E2S
  - TS-01M0R1JR37H6GZPSGHBT87H900
  - TS-01M0R1JARRXY042TNG6TA5R2JS
related:
  - TS-01M0QTQY7NTMKX6QT3W21W501W
parent: TS-01M0R1ANJXZV14BYG8SPA1T90P
directories:
  - apps/mobile
  - packages/engine
projects:
  - rahrow-mobile
  - rahrow-phase-07-production-and-distribution
---

Epic: Capacitor mobile shell must render the same packages/features UI as desktop and own native VPN.

Android VpnService can proceed in-repo. iOS Network Extension remains blocked until Apple developer credentials and entitlements exist.

Acceptance: mobile in-app UI matches desktop; native plugin is real on Android; unsupported/missing-entitlement states stay explicit; no protocol logic in Kotlin/Swift.
