---
id: 0000203-harden-reported-behavior-across-every-rahrow-platform
title: Harden reported behavior across every RahRow platform
status: doing
priority: urgent
risk: high
createdAt: 2026-09-01 21:10 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - cross-platform
  - reported-regressions
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
directories:
  - packages
  - apps
projects:
  - rahrow-cross-platform-hardening
  - rahrow-phase-05-integration-and-hardening
---

## Objective

Coordinate the reported cross-platform reliability, connection lifecycle, settings, localization, and interaction hardening work without duplicating existing engine/release programs.

## Platform contract

Every child task must state its applicability to Android, iOS, macOS, Linux, Windows, and CLI. Shared visual behavior is implemented once in packages/features/packages/ui and verified in Android/iOS WebViews plus macOS/Windows/Linux desktop shells; CLI is explicitly not applicable only for presentation-only behavior. Engine, connection-mode, lifecycle, settings-domain, cleanup, diagnostics, and copy semantics must include CLI where the CLI exposes the capability.

A feature is available only when the selected engine, connection mode, platform provider, entitlement/permission, bundled artifact, and release build all support it. Unsupported combinations fail closed and are absent or actionably explained; never fake parity or silently fall back from VPN/TUN to system proxy.

## Existing authoritative work to reuse

- Engine/mode capability selection: TS-01M1AP3WDCN9VWPAVCHXB76CS6.
- Android Xray TUN: TS-01M1AK591TGX2R6M7WFWEKGK5K and TS-01M1AK5GVR8HKWXESSFRA8H6N9.
- Installed-artifact leak and engine-switch gates: TS-01M12803X3B8JRVJF8BZ86EZN8.
- LAN proxy sharing: TS-01M19Z4CJE17HHTA5KX1Q916E3.
- Portable routing: TS-01M19Z4C235WSDN3CRTEVGJ3BK.
- Settings/About registry: TS-01M1A43H8YRCDGED2B907ZCM1P.
- Full diagnostic items: TS-01M1AP3WTK6MGE5ZNTJ4RVVYCA.
- Document locale/direction seam: TS-01M1AR6PD0R2MAXJ4HDKKXBWB0.

## Completion gate

Do not complete this program until its verification child passes on every applicable target, all linked existing tasks are done or have an explicit evidence-backed unsupported decision, Taskset doctor/generate pass, and each user report maps to a completed task or documented non-applicability.
