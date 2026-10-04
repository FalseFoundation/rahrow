---
id: c5c1af
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
  - c46ec9
  - d9f98e
  - 2659b4
parent: 02455e
directories:
  - apps/desktop
projects:
  - rahrow-production
  - rahrow-phase-04-native-runtime-and-capabilities
---

macOS VPN currently fails closed with actionable diagnostics and a release evidence gate. Single-application acceptance requires the RahRow app bundle to contain its Network Extension system or app extension, selected native engine framework, geo assets, notices, and activation code. RahRow must activate/update/deactivate the embedded provider through supported macOS APIs and remove it cleanly; users may approve normal macOS consent but must not install a separate VPN app, core, package, helper, or script. Blocked on the native provider/control plane, embedded Apple framework, identifiers, distribution choice, entitlements, signing/notarization, and clean-Mac evidence.
