---
id: e516e9
title: Add Ping Tunnel and DNSTT engine adapters
status: blocked
priority: urgent
risk: high
createdAt: 2026-08-27 13:16 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - p0-release-blocker
dependsOn:
  - 2659b4
  - d9f98e
parent: 9a604d
projects:
  - rahrow-phase-05-integration-and-hardening
---

Ping Tunnel and DNSTT remain separate engine adapters rather than false Xray or sing-box protocols. Any accepted implementation must embed the maintained client runtime, adapter, and required SOCKS/TUN bridge inside the RahRow application artifact and let RahRow own privilege requests, lifecycle, updates, and cleanup. It must not require users to install binaries, package-manager dependencies, scripts, or server tools locally. Until licensing, maintained runtime choice, server compatibility, ICMP privilege behavior, and bundleable TUN composition are approved, these capabilities remain unavailable and unadvertised.
