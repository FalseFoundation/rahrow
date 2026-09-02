---
id: TS-01M1FPKX1FEE05H57ZKW2G2Y4M
title: Display externally observed egress IP and remove local IP from Home
status: done
priority: high
risk: high
createdAt: 2026-09-01 23:59 UTC
updatedAt: 2026-09-02 00:26 UTC
labels:
  - external-ip
  - home
  - privacy
  - country
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
dependsOn:
  - TS-01M1FPMKT1NMRX3SPFPK7AM05T
parent: TS-01M1FPJKQ2DC8PQANDK2RVA27C
directories:
  - packages/core/src/platform
  - packages/features/src/home
  - apps/desktop
  - apps/mobile
  - apps/cli
projects:
  - rahrow-interfaces
  - rahrow-uiux
---

Replace Home local-interface and selected-profile endpoint display with the externally observed post-connect egress IP. Fetch only after authoritative connection success through an injected, timeout-bounded provider; clear/stale-label it on disconnect or route change; never expose the selected connection URL as a substitute. Optionally display a country flag only from a validated ISO country code and always pair it with accessible country text. Do not infer country locally from IP without a maintained database/provider contract; CLI reports the same egress observation.
