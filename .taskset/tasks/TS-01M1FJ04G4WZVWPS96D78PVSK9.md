---
id: TS-01M1FJ04G4WZVWPS96D78PVSK9
title: Declare and request native permissions only when capabilities need them
status: done
priority: urgent
risk: high
createdAt: 2026-09-01 22:38 UTC
updatedAt: 2026-09-01 22:55 UTC
labels:
  - native-permissions
  - entitlements
  - privacy
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
parent: TS-01M1FHYT7403GRGB8AEVAGCA5S
directories:
  - apps/mobile/android
  - apps/mobile/ios
  - apps/desktop/src-tauri
projects:
  - rahrow-mobile
  - rahrow-release
---

Audit camera, VPN/TUN, notifications if used, file import/export, clipboard/share, network, background service, and other native capability permissions across manifests, plist/entitlements, Tauri capabilities, runtime requests, denial recovery, and privacy descriptions. Request just in time, explain the purpose, handle denial/restricted states, avoid unused permissions, and prove packaged artifacts contain the declarations. CLI has no permission UI and is explicitly not applicable.
