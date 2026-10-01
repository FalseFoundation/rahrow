---
id: 0000069-connect-desktop-home-to-the-xray-sidecar-and-durable-store
title: Connect desktop Home to the Xray sidecar and durable store
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:32 UTC
updatedAt: 2026-08-23 22:46 UTC
labels:
  - prod-v2
  - desktop
  - xray
  - p0-blocker
dependsOn:
  - 0000054-give-desktop-a-durable-profile-and-settings-store
  - 0000062-build-the-shared-home-connection-screen
parent: 0000044-ship-a-production-desktop-client-around-the-shared-ui
directories:
  - apps/desktop
  - packages/engine
projects:
  - rahrow-desktop
---

Wire Connect/Disconnect/status/latency to Tauri Xray commands and the durable store. Add a Connect action; Home currently cannot connect.

Acceptance: selecting a profile and connecting starts the sidecar with generated config; status round-trips through core ConnectionController.
