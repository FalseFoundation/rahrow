---
id: df296f
title: Define one executable inventory for every native RahRow action
status: done
priority: urgent
risk: high
createdAt: 2026-09-01 21:20 UTC
updatedAt: 2026-09-01 21:55 UTC
labels:
  - cross-platform-hardening
  - native-actions
  - platform-capability
  - architecture
  - release-gate
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
related:
  - 260bc8
  - b8360d
parent: 04432a
directories:
  - packages/core/src/platform
  - packages/features/src
  - apps/desktop
  - apps/mobile
  - apps/cli
  - tests
projects:
  - rahrow-production
  - rahrow-cross-platform-hardening
---

## Objective

Create one typed, executable inventory of every action that crosses a platform boundary. At minimum include clipboard read/write and paste helpers; QR camera preview, permission, decoding and encoding; system share; save/download/file picker; external link and email opening; notifications; haptics where used; autostart and tray; LAN address/listener/firewall operations; engine process/runtime control; VPN/TUN; system proxy; and native diagnostics/status.

For every action record capability ID, owning shared contract, platform adapter, supported OS/build/architecture, permission or entitlement, cancellation semantics, result/error taxonomy, secret-handling rule, UI/CLI consumers, diagnostics, and installed-artifact test. Generated UI and CLI availability must come from capability status rather than platform-name conditionals.

No packages/features component may call navigator, Capacitor, Tauri, DOM download anchors, or native plugins directly. Native adapters live only at app edges. Unsupported actions are omitted or fail closed with an exact reason; test doubles and web fallbacks must never make release builds advertise native support.

## Acceptance

The inventory covers Android, iOS, macOS, Linux, Windows, and CLI, has no orphan capability or consumer, and is checked by repository/release tests so new native actions cannot ship without adapters, diagnostics, and verification evidence.
