---
id: 0000094-add-ping-tunnel-and-dnstt-engine-adapters
title: Add Ping Tunnel and DNSTT engine adapters
status: blocked
priority: urgent
risk: high
createdAt: 2026-08-27 13:16 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - p0-release-blocker
dependsOn:
  - 0000103-resolve-engine-licensing-and-store-distribution-model
  - 0000091-build-pinned-native-xray-and-sing-box-runtimes-for-android-and-apple
parent: 0000090-bundle-selectable-proxy-engines-and-define-the-protocol-roadmap
projects:
  - rahrow-phase-05-integration-and-hardening
---

Ping Tunnel and DNSTT remain separate engine adapters rather than false Xray or sing-box protocols. Any accepted implementation must embed the maintained client runtime, adapter, and required SOCKS/TUN bridge inside the RahRow application artifact and let RahRow own privilege requests, lifecycle, updates, and cleanup. It must not require users to install binaries, package-manager dependencies, scripts, or server tools locally. Until licensing, maintained runtime choice, server compatibility, ICMP privilege behavior, and bundleable TUN composition are approved, these capabilities remain unavailable and unadvertised.
