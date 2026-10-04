---
id: 8d52d4
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
  - 761c27
  - a27174
  - 928ff0
related:
  - e208b3
parent: 713ce0
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
