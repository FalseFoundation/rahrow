---
id: a06d4b
title: Expose active LAN addresses through native platform ports
status: done
priority: medium
risk: medium
createdAt: 2026-08-30 17:56 UTC
updatedAt: 2026-08-30 20:34 UTC
labels:
  - network
  - native
parent: "542944"
directories:
  - apps/desktop
  - apps/mobile
  - packages/features
projects:
  - rahrow
---

Add desktop, Android, and iOS adapters that select usable IPv4/IPv6 addresses from the active underlying physical interface, excluding loopback, unspecified, and tunnel interfaces. Surface the value through a shared network identity port and omit it when selection is ambiguous.
