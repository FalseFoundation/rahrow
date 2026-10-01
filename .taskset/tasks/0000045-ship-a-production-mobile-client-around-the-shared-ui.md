---
id: 0000045-ship-a-production-mobile-client-around-the-shared-ui
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
  - 0000042-make-the-xray-engine-a-real-production-runtime
  - 0000043-build-identical-desktop-mobile-product-ui-in-packages-features
  - 0000041-replace-in-memory-app-stores-with-durable-persistence
related:
  - 0000034-implement-production-mobile-vpn-bridge-plan
parent: 0000039-ship-rahrow-as-a-production-v2ray-xray-client
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
