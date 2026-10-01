---
id: 0000244-display-externally-observed-egress-ip-and-remove-local-ip-from-home
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
  - 0000247-research-post-connect-public-ip-and-cloudflare-network-test-providers
parent: 0000239-post-connect-intelligence-and-background-smart-connect
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
