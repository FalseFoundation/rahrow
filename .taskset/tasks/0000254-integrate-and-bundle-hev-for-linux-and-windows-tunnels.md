---
id: 0000254-integrate-and-bundle-hev-for-linux-and-windows-tunnels
title: Integrate and bundle HEV for Linux and Windows tunnels
status: todo
priority: high
risk: critical
createdAt: 2026-09-02 01:13 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - linux
  - windows
  - native
  - routing
parent: 0000249-adopt-hev-socks5-tunnel-as-the-default-compatible-vpn-tunnel-provider
directories:
  - apps/desktop
projects:
  - rahrow-native-desktop
  - rahrow-phase-04-native-runtime-and-capabilities
---

HEV is a candidate default on Linux and conditional on Windows, but the current desktop build has no packaged privileged TUN service or installed Wintun service. Diagnostics now report these gates and fail closed. Native service packaging and rollback validation remain required before enabling HEV.
