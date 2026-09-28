---
id: TS-01M1FD3HVTCWG4G0V3Q3MEBE0M
title: Keep Android VPN connected state truthful until native teardown completes
status: blocked
priority: urgent
risk: high
createdAt: 2026-09-01 21:13 UTC
updatedAt: 2026-09-14 00:48 UTC
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

## Completed repository work

- [x] Persist Disconnecting before requesting service shutdown and wait for foreground-service teardown acknowledgment.
- [x] Treat missing stop targets, provider-process loss, native cleanup failures, and bounded stop timeouts as Error while preserving profile, engine, and TUN-backend identity.
- [x] Snapshot native ownership and continue cleanup through HEV, provider/TUN, process-lock, and foreground-notification failures.
- [x] Publish Disconnected only after cleanup succeeds.
- [x] Cover the bridge contract, native failure containment, cleanup continuation, and stop-failure identity in focused Vitest and Android JVM tests.

## Blocker

Installed-device acceptance requires adb plus Android API/ABI targets, neither of which is available in this environment. This is excluded by the no-new-installations constraint. Before unblocking, exercise sing-box and Xray with rapid taps, force-stop, crash, reboot, revoke, and assert route/DNS/TUN/notification cleanup.
