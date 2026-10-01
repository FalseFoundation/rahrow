---
id: 0000098-implement-macos-registered-network-extension-vpn
title: Implement macOS registered Network Extension VPN
status: blocked
priority: urgent
risk: high
createdAt: 2026-08-27 18:33 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - vpn
  - macos
  - apple
  - blocked-credentials
  - p0-release-blocker
dependsOn:
  - 0000097-refactor-vpn-runtime-around-platform-owned-tunnel-providers
  - 0000091-build-pinned-native-xray-and-sing-box-runtimes-for-android-and-apple
  - 0000103-resolve-engine-licensing-and-store-distribution-model
parent: 0000096-make-vpn-tun-the-default-and-generalize-engine-runtime-naming
directories:
  - apps/desktop
projects:
  - rahrow-production
  - rahrow-phase-04-native-runtime-and-capabilities
---

macOS VPN currently fails closed with actionable diagnostics and a release evidence gate. Single-application acceptance requires the RahRow app bundle to contain its Network Extension system or app extension, selected native engine framework, geo assets, notices, and activation code. RahRow must activate/update/deactivate the embedded provider through supported macOS APIs and remove it cleanly; users may approve normal macOS consent but must not install a separate VPN app, core, package, helper, or script. Blocked on the native provider/control plane, embedded Apple framework, identifiers, distribution choice, entitlements, signing/notarization, and clean-Mac evidence.
