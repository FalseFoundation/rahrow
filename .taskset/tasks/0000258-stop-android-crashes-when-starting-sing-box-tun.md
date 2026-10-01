---
id: 0000258-stop-android-crashes-when-starting-sing-box-tun
title: Stop Android crashes when starting sing-box TUN
status: blocked
priority: urgent
risk: critical
createdAt: 2026-09-02 03:49 UTC
updatedAt: 2026-09-14 00:48 UTC
labels:
  - android
  - sing-box
  - tun
  - crash
  - native-engine
  - p0-release-blocker
  - reported-regression
related:
  - 0000209-keep-android-vpn-connected-state-truthful-until-native-teardown-complete
  - 0000249-adopt-hev-socks5-tunnel-as-the-default-compatible-vpn-tunnel-provider
  - 0000218-verify-the-reported-hardening-program-on-installed-artifacts
parent: 0000099-replace-android-vpn-skeleton-with-native-engine-providers
directories:
  - apps/mobile/android
  - apps/mobile/src
  - packages/engine
  - engines
projects:
  - rahrow-mobile
  - rahrow-cross-platform-hardening
  - rahrow-phase-04-native-runtime-and-capabilities
---

Reproduce the installed Android crash from selecting sing-box in VPN/TUN mode and pressing Connect. Capture Java/Kotlin, native, and engine crash evidence; trace VPN permission, file-descriptor ownership, config generation, process/service lifetime, ABI packaging, and teardown. Fix the first failing boundary without silently falling back to system proxy or another engine.

Acceptance: supported Android ABIs start sing-box TUN, pass traffic, report truthful connecting/connected/error states, disconnect cleanly, recover after denial or process death, and never crash on repeated connect/disconnect, engine switching, app background/resume, malformed profiles, or revoked VPN permission.

## Completed repository work — 2026-09-14

- Added a native VPN start boundary that contains non-fatal JNI/linkage failures and reports them through the error-state path instead of terminating the VPN process.
- Covered sing-box setup, validation, command-server construction, activation, and teardown.
- Made cleanup ordered and best-effort across HEV, engine provider/TUN, process lock, and foreground notification.
- Missing stop targets, provider-process loss, native cleanup failures, and stop timeouts now remain truthful Error states rather than false Disconnected states.
- Added Kotlin and TypeScript contract tests for startup, fatal/non-fatal failures, cleanup continuation, acknowledgment, and stop-error identity.
- Regenerated Capacitor paths, aligned AGP/Kotlin, and verified the Android unit suite and debug APK with all declared ABI libraries.

## Blocker

The remaining acceptance requires an installed Android emulator/device and adb, which are not available in this environment and are excluded by the no-new-installations constraint. Run lifecycle and traffic cases for denial, revoke, process death, background/resume, repeated connect/disconnect, engine switching, and malformed profiles before unblocking.
