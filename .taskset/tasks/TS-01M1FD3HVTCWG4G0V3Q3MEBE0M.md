---
id: TS-01M1FD3HVTCWG4G0V3Q3MEBE0M
title: Keep Android VPN connected state truthful until native teardown completes
status: todo
priority: urgent
risk: high
createdAt: 2026-09-01 21:13 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - cross-platform-hardening
  - android
  - vpn
  - disconnect
  - sing-box
  - native
  - p0-release-blocker
  - reported-regression
related:
  - TS-01M12802Q8B03PA8BWSQZYEBWR
  - TS-01M12803X3B8JRVJF8BZ86EZN8
parent: TS-01M1FCY8ZHNE0E843BHX893G1F
directories:
  - apps/mobile/src
  - apps/mobile/android
  - packages/core/src/connection
  - packages/features/src/home
projects:
  - rahrow-mobile
  - rahrow-cross-platform-hardening
  - rahrow-phase-04-native-runtime-and-capabilities
---

## Report

With sing-box in Android VPN mode, pressing power off makes RahRow look disconnected while Android still reports the VPN connected.

## Work

Trace JS command, Capacitor bridge, VpnService stop request, sing-box service close, TUN descriptor closure, foreground-service lifecycle, status store, callbacks, timeout, revoke, crash, and UI observer. Never write or render disconnected until the OS tunnel is confirmed down and the provider acknowledges engine/TUN teardown. A missing stop target, timeout, or native exception is an error/recovery state, not success.

Make stop idempotent and safe during connecting/reconnecting, app background, service recreation, permission revoke, engine crash, and repeated taps. If teardown is delayed, keep Disconnecting visible with bounded progress and recovery guidance.

## Acceptance

Tests reproduce the reported device sequence and assert Android VPN state, routes, DNS, TUN FD, engine process, notification, and RahRow state converge. Cover sing-box and Xray providers, API levels/ABIs, rapid connect-disconnect, force-stop/crash/reboot, and timeout/error paths on installed devices.
