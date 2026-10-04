---
id: 2aea98
title: Integrate and bundle HEV for Apple packet tunnels
status: todo
priority: urgent
risk: critical
createdAt: 2026-09-02 01:13 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - ios
  - macos
  - network-extension
  - xcframework
parent: "1876e5"
directories:
  - apps/mobile/ios
  - apps/desktop/src-tauri
projects:
  - rahrow-native-mobile
  - rahrow-native-desktop
  - rahrow-phase-04-native-runtime-and-capabilities
---

Research found no supported numeric utun file-descriptor bridge for the current Network Extension provider. Keep the engine-native Apple packet tunnel selected and HEV marked experimental until a signed descriptor bridge passes device and App Store validation.
