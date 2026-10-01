---
id: 0000044-ship-a-production-desktop-client-around-the-shared-ui
title: Ship a production desktop client around the shared UI
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:29 UTC
updatedAt: 2026-08-23 22:47 UTC
labels:
  - prod-v2
  - desktop
  - native
  - p0-blocker
dependsOn:
  - 0000042-make-the-xray-engine-a-real-production-runtime
  - 0000043-build-identical-desktop-mobile-product-ui-in-packages-features
  - 0000041-replace-in-memory-app-stores-with-durable-persistence
related:
  - 0000033-implement-production-desktop-native-integrations
parent: 0000039-ship-rahrow-as-a-production-v2ray-xray-client
directories:
  - apps/desktop
  - packages/engine
projects:
  - rahrow-desktop
---

Epic: Tauri desktop shell must run the shared features UI, persist data, start the Xray sidecar, and implement native capabilities.

Acceptance: Connect works against a real sidecar; tray, autostart, system proxy, and notifications are implemented or explicitly remain blocked behind signing; the rendered product UI is the packages/features UI, not a desktop-only layout.
