---
id: 0000097-refactor-vpn-runtime-around-platform-owned-tunnel-providers
title: Refactor VPN runtime around platform-owned tunnel providers
status: done
priority: urgent
risk: high
createdAt: 2026-08-27 18:33 UTC
updatedAt: 2026-08-28 09:48 UTC
labels:
  - vpn
  - architecture
  - p0-release-blocker
parent: 0000096-make-vpn-tun-the-default-and-generalize-engine-runtime-naming
directories:
  - packages/core
  - packages/engine
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-production
---

Implemented the engine-neutral VpnTunnelProvider contract and coordinator with structured availability, exclusive ownership, validated teardown, failed-start rollback, crash recovery, and secret redaction. Mobile and desktop app runtimes now connect through platform-owned provider adapters; mobile compiles the selected engine configuration inside its provider edge, while desktop fails closed unless the registered provider confirms a connected tunnel and never launches a sidecar TUN path. Native Android, Apple, Windows, and Linux provider implementations remain tracked by their dedicated platform tasks.
