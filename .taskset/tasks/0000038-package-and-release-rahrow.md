---
id: 0000038-package-and-release-rahrow
title: Package and release RahRow
status: blocked
priority: high
risk: high
createdAt: 2026-08-23 17:30 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - prod-grade
  - packaging
  - p0-release-blocker
  - blocked-signing
dependsOn:
  - 0000037-add-production-checks
  - 0000091-build-pinned-native-xray-and-sing-box-runtimes-for-android-and-apple
  - 0000074-implement-ios-network-extension-vpn
  - 0000098-implement-macos-registered-network-extension-vpn
  - 0000099-replace-android-vpn-skeleton-with-native-engine-providers
  - 0000100-implement-windows-wintun-vpn-service-and-installer
  - 0000101-implement-linux-tun-service-and-package-authorization
  - 0000102-add-vpn-leak-lifecycle-and-engine-switch-release-gates
  - 0000106-fold-cli-access-into-each-desktop-rahrow-installation
  - 0000107-remove-linux-system-proxy-host-utility-dependency
related:
  - 0000048-prepare-release-artifacts-and-signing
  - 0000039-ship-rahrow-as-a-production-v2ray-xray-client
parent: 0000025-make-rahrow-production-grade
directories:
  - apps/desktop
  - apps/mobile
  - apps/cli
projects:
  - rahrow-release
  - rahrow-phase-07-production-and-distribution
---

The CLI, mobile web, desktop web, and a local unsigned macOS app bundle build successfully; the macOS bundle contains Xray, sing-box, geo assets, licenses, and notices. Completion requires one self-contained application artifact for each target OS and release channel. Desktop CLI behavior must ship inside and be managed by the same desktop installation; a standalone CLI build may exist for contributors but must not be a second required production download. Each artifact must embed all advertised engines and OS providers, verify its installed layout, require no separate runtime or package installation, perform no first-run executable download, and own update and removal of nested services or extensions. Production publishing remains blocked on unified packaging, signing/notarization, Apple entitlements, registered Windows/Linux/macOS providers, immutable runtime checksums, and installed device or VM lifecycle evidence.
