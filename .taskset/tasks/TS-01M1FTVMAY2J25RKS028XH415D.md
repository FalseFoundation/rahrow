---
id: TS-01M1FTVMAY2J25RKS028XH415D
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
parent: TS-01M1FTV56KCS5XA8XEBQMWC11V
directories:
  - apps/desktop
projects:
  - rahrow-native-desktop
  - rahrow-phase-04-native-runtime-and-capabilities
---

HEV is a candidate default on Linux and conditional on Windows, but the current desktop build has no packaged privileged TUN service or installed Wintun service. Diagnostics now report these gates and fail closed. Native service packaging and rollback validation remain required before enabling HEV.
