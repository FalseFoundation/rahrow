---
id: d9d73c
title: Prove privileged native lifecycle actions and cleanup on every OS
status: todo
priority: urgent
risk: high
createdAt: 2026-09-01 21:20 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - cross-platform-hardening
  - native-actions
  - vpn
  - system-proxy
  - lan-sharing
  - engine-lifecycle
  - p0-release-blocker
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
dependsOn:
  - df296f
  - b8360d
related:
  - b8360d
  - cbd830
  - a3ee63
  - 4a3d67
  - cceb79
parent: 04432a
directories:
  - packages/core/src/connection
  - packages/core/src/platform
  - packages/engine
  - apps/desktop
  - apps/mobile
  - apps/cli
  - engines
  - tests
  - .github/workflows
projects:
  - rahrow-production
  - rahrow-cross-platform-hardening
  - rahrow-phase-06-verification-and-release-gates
---

## Scope

Verify every privileged/native lifecycle action: engine start/stop/restart/status, VPN permission and registered tunnel connect/disconnect, TUN/Wintun/Network Extension/VpnService teardown, system-proxy capture/enable/restore, LAN proxy listener and firewall lifecycle, route/DNS cleanup, autostart, tray, notification, crash recovery, upgrade, and uninstall cleanup.

Use the shared desired-versus-effective connection state and capability matrix. UI/CLI success is emitted only after the OS and engine acknowledge the effective state. Timeouts, revoked permissions, missing drivers/extensions, privilege denial, external OS changes, crashes, and partial cleanup remain actionable error/recovery states. Never silently substitute proxy mode for VPN.

## Evidence

Installed-artifact tests must inspect real OS VPN/proxy/route/DNS/process/service/extension/firewall state on Android, iOS, macOS, Windows, and Linux for Xray and sing-box wherever advertised. Cover repeated and concurrent actions, sleep/resume, network handoff, reboot, app force-stop, crash, update, and uninstall. CLI may control only capabilities owned by the installed application and must expose truthful status and exit codes. Release stays blocked for any advertised cell without native evidence.
