---
id: TS-01M1FPKXDA3BCEV753CGTVWC7J
title: Make active connections and Smart Connect background-capable on native hosts
status: done
priority: urgent
risk: critical
createdAt: 2026-09-01 23:59 UTC
updatedAt: 2026-09-02 00:27 UTC
labels:
  - background
  - native
  - lifecycle
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
dependsOn:
  - TS-01M1FPKW9GTAEBR2TXMXSZXVJD
parent: TS-01M1FPJKQ2DC8PQANDK2RVA27C
directories:
  - apps/mobile
  - apps/desktop
  - packages/core/src/platform
projects:
  - rahrow-native-mobile
  - rahrow-native-desktop
  - rahrow-cross-platform-hardening
---

Audit and implement OS-supported background ownership for an active VPN/proxy and the five-minute Smart Connect schedule. Android uses foreground service/work scheduling within platform limits; iOS keeps packet-tunnel ownership in the Network Extension and uses only permitted background refresh/processing rather than promising exact timers; desktop uses the native app/tray/service lifecycle appropriate to macOS, Windows, and Linux. Persist next-due state, recover after suspension/restart, avoid duplicate runners, respect battery/network restrictions, expose truthful capability/diagnostics, and fail closed where the OS cannot guarantee periodic execution.\n\nImplemented: a single deduplicated host schedule runner recovers persisted due state, aborts cleanly, and catches up on mobile activation. Desktop keeps the runner alive with the tray process. Android foreground VPN services redeliver valid start intents after process recreation and tear down foreground state explicitly. iOS packet-tunnel ownership remains independent of the app. Mobile diagnostics report exact periodic Smart Connect as unavailable and describe activation-time catch-up because Android and iOS do not guarantee a five-minute suspended-app timer.
