---
id: 0000102-add-vpn-leak-lifecycle-and-engine-switch-release-gates
title: Add VPN leak lifecycle and engine-switch release gates
status: blocked
priority: urgent
risk: high
createdAt: 2026-08-27 18:33 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - vpn
  - security
  - testing
  - p0-release-blocker
dependsOn:
  - 0000098-implement-macos-registered-network-extension-vpn
  - 0000099-replace-android-vpn-skeleton-with-native-engine-providers
  - 0000100-implement-windows-wintun-vpn-service-and-installer
  - 0000101-implement-linux-tun-service-and-package-authorization
  - 0000074-implement-ios-network-extension-vpn
parent: 0000096-make-vpn-tun-the-default-and-generalize-engine-runtime-naming
directories:
  - tests
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-production
  - rahrow-phase-06-verification-and-release-gates
---

A checked 21-condition VPN evidence evaluator covers consent, OS state, TCP/UDP IPv4/IPv6, DNS and route leaks, TunnelVision posture, lifecycle/crash/reboot/handoff cleanup, concurrent exclusion, engine switching, revocation, and uninstall. Single-application release evidence must test the actual installed RahRow artifact with all embedded engines/providers and prove that app-driven upgrade, switching, crash recovery, and uninstall leave no orphaned service, extension, route, DNS state, or engine data. Production remains blocked on completed platform providers and real clean-device or VM runs.
