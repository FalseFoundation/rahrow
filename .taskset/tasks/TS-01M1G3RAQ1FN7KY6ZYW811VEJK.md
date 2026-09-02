---
id: TS-01M1G3RAQ1FN7KY6ZYW811VEJK
title: Stop Android crashes when starting sing-box TUN
status: todo
priority: urgent
risk: critical
createdAt: 2026-09-02 03:49 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - android
  - sing-box
  - tun
  - crash
  - native-engine
  - p0-release-blocker
  - reported-regression
related:
  - TS-01M1FD3HVTCWG4G0V3Q3MEBE0M
  - TS-01M1FTV56KCS5XA8XEBQMWC11V
parent: TS-01M12802Q8B03PA8BWSQZYEBWR
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
