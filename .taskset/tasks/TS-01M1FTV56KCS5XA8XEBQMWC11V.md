---
id: TS-01M1FTV56KCS5XA8XEBQMWC11V
title: Adopt hev-socks5-tunnel as the default compatible VPN tunnel provider
status: doing
priority: urgent
risk: critical
createdAt: 2026-09-02 01:13 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - hev-socks5-tunnel
  - vpn
  - tun2socks
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
directories:
  - packages/core
  - apps/mobile
  - apps/desktop
  - apps/cli
projects:
  - rahrow-native-mobile
  - rahrow-native-desktop
  - rahrow-cross-platform-hardening
  - rahrow-phase-04-native-runtime-and-capabilities
---

Integrate pinned, bundled hev-socks5-tunnel as RahRow's default TUN-to-SOCKS provider wherever the native platform and release artifact can support it. Keep Xray and sing-box as proxy protocol engines, fail closed where the HEV native artifact or OS VPN facility is unavailable, and preserve the one-application distribution contract.
