---
id: 6d970a
title: Run a Cloudflare-default network test after successful connection
status: done
priority: high
risk: high
createdAt: 2026-09-01 23:59 UTC
updatedAt: 2026-09-02 02:00 UTC
labels:
  - speed-test
  - connection-lifecycle
  - cloudflare
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
dependsOn:
  - 48a929
parent: "665301"
directories:
  - packages/core
  - packages/features/src/home
  - apps/cli
projects:
  - rahrow-core
  - rahrow-uiux
---

After authoritative Connected state, run a cancellable Cloudflare zero-byte latency request followed by an exact 1 MiB download estimate. Display latency and download Mbps separately with the 1 MiB cap visible. Route both requests through the installed VPN route or the allowlisted loopback SOCKS path for proxy mode, preserve latency if the download sample fails, and cancel stale generations on disconnect or transition.
