---
id: TS-01M12803X3B8JRVJF8BZ86EZN8
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
  - TS-01M1280255E25TTEKC7PC00J1M
  - TS-01M12802Q8B03PA8BWSQZYEBWR
  - TS-01M12803437GM2X0PSW3VF8SXE
  - TS-01M12803GWY4K1H9QSHSRH0H5Y
  - TS-01M0R1R5N25BP240YMMZPFNZ3V
parent: TS-01M11V0TEC0X5B397WT2ERJA3W
directories:
  - tests
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-production
  - rahrow-phase-06-verification-and-release-gates
---

A checked 21-condition VPN evidence evaluator covers consent, OS state, TCP/UDP IPv4/IPv6, DNS and route leaks, TunnelVision posture, lifecycle/crash/reboot/handoff cleanup, concurrent exclusion, engine switching, revocation, and uninstall. Single-application release evidence must test the actual installed RahRow artifact with all embedded engines/providers and prove that app-driven upgrade, switching, crash recovery, and uninstall leave no orphaned service, extension, route, DNS state, or engine data. Production remains blocked on completed platform providers and real clean-device or VM runs.
