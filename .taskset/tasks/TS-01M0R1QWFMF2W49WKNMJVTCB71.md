---
id: TS-01M0R1QWFMF2W49WKNMJVTCB71
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
  - TS-01M0R1M0ABWKS5WBZBX2MYWJZ5
  - TS-01M0R1QFF9P2PTQREKTJ6D22B6
parent: TS-01M0R1JWTN9Y1BGD7D1ENK041D
directories:
  - apps/desktop
  - packages/engine
projects:
  - rahrow-desktop
---

Wire Connect/Disconnect/status/latency to Tauri Xray commands and the durable store. Add a Connect action; Home currently cannot connect.

Acceptance: selecting a profile and connecting starts the sidecar with generated config; status round-trips through core ConnectionController.
