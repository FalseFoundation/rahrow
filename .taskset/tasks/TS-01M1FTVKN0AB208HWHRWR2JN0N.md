---
id: TS-01M1FTVKN0AB208HWHRWR2JN0N
title: Integrate and bundle HEV for Android VPNService
status: done
priority: urgent
risk: critical
createdAt: 2026-09-02 01:13 UTC
updatedAt: 2026-09-02 01:54 UTC
labels:
  - android
  - jni
  - vpnservice
parent: TS-01M1FTV56KCS5XA8XEBQMWC11V
directories:
  - apps/mobile/android
projects:
  - rahrow-native-mobile
---

Bundled the pinned HEV 2.17.1 JNI runtime for four Android ABIs, wired it to VPNService after the sing-box loopback listener is ready, and fail closed unless the verified artifact and socket-protection adapter are present. Final Android build and lifecycle validation remains in the consolidated safety pass.
