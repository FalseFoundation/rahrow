---
id: TS-01M0R1JWTN9Y1BGD7D1ENK041D
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
  - TS-01M0R1JHED81QWBMSMG5X42E2S
  - TS-01M0R1JR37H6GZPSGHBT87H900
  - TS-01M0R1JARRXY042TNG6TA5R2JS
related:
  - TS-01M0QTQQBDA75D6MN9JDMFRGWW
parent: TS-01M0R1ANJXZV14BYG8SPA1T90P
directories:
  - apps/desktop
  - packages/engine
projects:
  - rahrow-desktop
---

Epic: Tauri desktop shell must run the shared features UI, persist data, start the Xray sidecar, and implement native capabilities.

Acceptance: Connect works against a real sidecar; tray, autostart, system proxy, and notifications are implemented or explicitly remain blocked behind signing; the rendered product UI is the packages/features UI, not a desktop-only layout.
