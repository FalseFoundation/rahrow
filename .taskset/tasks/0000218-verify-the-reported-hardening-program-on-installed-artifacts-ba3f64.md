---
id: ba3f64
title: Verify the reported hardening program on installed artifacts
status: todo
priority: urgent
risk: high
createdAt: 2026-09-01 21:14 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - cross-platform-hardening
  - validation
  - installed-artifacts
  - release-gate
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
dependsOn:
  - 08d948
  - a65183
  - a61e02
  - 063adb
  - b8360d
  - cbd830
  - a3ee63
  - 0ab392
  - d9220b
  - 1aa3e8
  - a6dc0a
  - 87d9a4
  - aae988
  - 4ba66b
  - 94b73c
  - aab45b
  - 9fde1c
  - 4a3d67
  - 8c9114
  - 17dc5d
  - cceb79
  - a4e92a
  - c5c1af
  - c1d9fc
  - c2d2a7
  - e083f8
  - d3aee5
  - 957ef5
  - df296f
  - 9c4b96
  - d9d73c
parent: 04432a
directories:
  - tests
  - packages
  - apps
  - engines
  - .github/workflows
projects:
  - rahrow-testing
  - rahrow-cross-platform-hardening
  - rahrow-phase-06-verification-and-release-gates
---

## Objective

Run the final installed-artifact and shared-interface verification for every report in this hardening program.

## Required matrix

- Android: supported API levels, representative ABIs, real VpnService state, Xray and sing-box.
- iOS: signed device Network Extension behavior, both bundled engines where supported.
- macOS: supported CPU architectures and Network Extension/system-proxy cleanup.
- Windows: supported architectures, Wintun/service/system-proxy lifecycle.
- Linux: supported packages/desktops, TUN authorization/system-proxy lifecycle.
- CLI: every bundled engine, proxy commands, capability/status/settings semantics, and VPN control only where the installed desktop application truthfully exposes it.

Test every advertised engine × mode × platform cell and verify unsupported cells are hidden or fail closed. Exercise cold/warm navigation, all screen loading states, toasts with/without drawers, EN/FA direction, icon actions, long press/context menus, URL selection, settings scroll continuity, concise latency copy, Diagnostics, About, VPN disconnect, and active profile/mode/engine reconfiguration.

## Evidence and gates

Use unit/integration tests plus real installed devices/VMs for native state. Confirm external OS VPN/proxy/route/DNS/process state rather than trusting only RahRow UI/status stores. Include crash, force-stop, revoke, sleep/resume, reboot, upgrade, uninstall, offline, slow I/O, RTL, 200% zoom, keyboard, VoiceOver, and TalkBack where applicable.

Run focused package/native suites, cross-interface tests, desktop/mobile/CLI builds, release artifact checks, pnpm check, pnpm exec taskset doctor, pnpm exec taskset generate, and git diff --check. Record signed-hardware or credential blockers as explicit evidence gaps; do not mark complete from mocks or placeholder providers.


## Added lock and native-action coverage

Also verify that cleanup/purge never removes a locked aggregate or descendant, revalidates locks at commit time, and reports skipped-locked counts before and after the operation. Confirm lock indicators and action availability remain consistent across rows, groups, drawers, long press/context menus, accessibility APIs, and CLI output.

Execute the native-action inventory end to end: QR camera/encode, clipboard read/write and paste helpers, copy, system share, save/download/file import, safe links, permissions/cancellation, autostart/tray/notifications where supported, engine lifecycle, VPN/TUN, system proxy, LAN sharing, and cleanup. Verify real adapters and OS state on every advertised platform; mocked capabilities are insufficient for completion.
