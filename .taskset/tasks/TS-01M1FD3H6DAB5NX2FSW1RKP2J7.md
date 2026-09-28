---
id: TS-01M1FD3H6DAB5NX2FSW1RKP2J7
title: Publish and enforce the engine × mode × platform capability matrix
status: doing
priority: urgent
risk: high
createdAt: 2026-09-01 21:13 UTC
updatedAt: 2026-09-14 00:49 UTC
labels:
  - cross-platform-hardening
  - engines
  - connection-mode
  - capability-matrix
  - release-gate
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
related:
  - TS-01M1AP3WDCN9VWPAVCHXB76CS6
  - TS-01M11M0JVKQNTKAKPHQXM5M88A
  - TS-01M12803X3B8JRVJF8BZ86EZN8
  - TS-01M1AK591TGX2R6M7WFWEKGK5K
parent: TS-01M1FCY8ZHNE0E843BHX893G1F
directories:
  - packages/core
  - packages/engine
  - apps/cli
  - apps/desktop
  - apps/mobile
  - engines
  - .github/workflows
projects:
  - rahrow-production
  - rahrow-cross-platform-hardening
  - rahrow-phase-01-idea-and-research
---

## Objective

Define one executable matrix for Xray, Xray TUN, sing-box, sing-box TUN, Windows Wintun, and future providers across VPN/TUN and system-proxy modes on Android, iOS, macOS, Linux, Windows, and CLI.

Availability is the intersection of bundled runtime, engine adapter, mode, native provider/driver/extension, ABI/architecture, entitlement/permission, and build flavor. Wintun is a Windows tunnel provider, not a peer engine choice. CLI supports proxy mode wherever its bundled engine can run; VPN/TUN is exposed only where the installed application owns a real OS provider and CLI commands can safely control it.

## Progress

- [x] Added a shared core resolver for engine, platform, mode, bundled runtime, adapter, build, architecture, native provider, system-proxy adapter, and permission inputs.
- [x] Structurally hides mobile System proxy and CLI VPN/TUN cells.
- [x] Keeps Android Xray VPN/TUN unavailable until the packaged descriptor adapter is verified.
- [x] Generates shared Settings mode choices and CLI status diagnostics from the matrix.
- [x] Added exhaustive core cells/reason tests plus shared Settings and CLI coverage.
- [ ] Feed signed-build entitlement and installed-runtime evidence into every desktop/mobile app edge.
- [ ] Make release validation compare advertised cells with installed artifact contents and lifecycle evidence.
- [ ] Prove traffic, stop, switch, and route/DNS/proxy/process cleanup on installed targets.

## Acceptance

Generate shared UI/CLI choices and diagnostics from the matrix. Installed-artifact tests prove each advertised cell connects, passes traffic, stops, switches, and cleans routes/DNS/proxy/process state. Release checks reject missing or wrong artifacts and false capability claims. Unsupported cells fail closed with an exact reason; never promise unconditional parity or silently substitute system proxy for VPN.
