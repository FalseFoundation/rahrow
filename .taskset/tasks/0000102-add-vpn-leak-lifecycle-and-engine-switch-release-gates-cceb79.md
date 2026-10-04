---
id: cceb79
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
  - c5c1af
  - c1d9fc
  - c2d2a7
  - e083f8
  - a4e92a
parent: 02455e
directories:
  - tests
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-production
  - rahrow-phase-06-verification-and-release-gates
---

A checked 21-condition VPN evidence evaluator covers consent, OS state, TCP/UDP IPv4/IPv6, DNS and route leaks, TunnelVision posture, lifecycle/crash/reboot/handoff cleanup, concurrent exclusion, engine switching, revocation, and uninstall. Single-application release evidence must test the actual installed RahRow artifact with all embedded engines/providers and prove that app-driven upgrade, switching, crash recovery, and uninstall leave no orphaned service, extension, route, DNS state, or engine data. Production remains blocked on completed platform providers and real clean-device or VM runs.
