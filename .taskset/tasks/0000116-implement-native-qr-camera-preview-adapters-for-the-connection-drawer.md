---
id: 0000116-implement-native-qr-camera-preview-adapters-for-the-connection-drawer
title: Implement native QR camera preview adapters for the connection drawer
status: done
priority: high
risk: high
createdAt: 2026-08-29 19:23 UTC
updatedAt: 2026-08-30 20:36 UTC
labels:
  - native
  - qr
  - mobile
parent: 0000111-build-one-connection-import-drawer-and-preserve-subscription-ownership
directories:
  - apps/mobile/android
  - apps/mobile/ios
  - apps/mobile/src
projects:
  - rahrow-uiux
---

Implement Android and iOS/Capacitor adapters for AppRuntime.renderQrCameraPreview so the shared QR tab displays a live camera surface in its preview area, handles camera permission and lifecycle, and passes decoded text through the existing QR scanner boundary. Preserve the native platform edge and add native contract tests.
