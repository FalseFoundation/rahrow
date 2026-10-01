---
id: 0000264-repair-macos-system-proxy-mode-end-to-end
title: Repair macOS system-proxy mode end to end
status: todo
priority: urgent
risk: critical
createdAt: 2026-09-02 03:49 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - macos
  - system-proxy
  - native
  - connection-mode
  - p0-release-blocker
  - reported-regression
related:
  - 0000071-implement-desktop-system-proxy-tray-and-autostart
  - 0000248-route-egress-and-cloudflare-probes-through-proxy-mode
  - 0000223-prove-privileged-native-lifecycle-actions-and-cleanup-on-every-os
parent: 0000175-expose-capability-gated-tun-and-system-proxy-connection-modes
directories:
  - apps/desktop/src-tauri
  - apps/desktop/src
  - packages/engine
  - packages/core/src/connection
  - packages/features/src/home
projects:
  - rahrow-native-desktop
  - rahrow-cross-platform-hardening
  - rahrow-phase-04-native-runtime-and-capabilities
---

Reproduce the reported macOS System proxy failure on an installed app and trace the complete path: engine readiness and local endpoint, current network-service discovery, proxy state capture, authenticated OS application, verification, traffic routing, disconnect restoration, and crash recovery. Do not claim connected until both engine and macOS proxy state are effective.

Acceptance covers Ethernet and Wi-Fi, changing active service, PAC/manual proxy conflicts, privilege denial, missing endpoint, repeated connect/disconnect, engine or profile switch, app crash/relaunch, and exact restoration of prior HTTP/HTTPS/SOCKS/bypass settings. Record other platforms separately if the same defect is confirmed.
