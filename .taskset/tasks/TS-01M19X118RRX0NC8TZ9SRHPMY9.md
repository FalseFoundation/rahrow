---
id: TS-01M19X118RRX0NC8TZ9SRHPMY9
title: Expose active LAN addresses through native platform ports
status: done
priority: medium
risk: medium
createdAt: 2026-08-30 17:56 UTC
updatedAt: 2026-08-30 20:34 UTC
labels:
  - network
  - native
parent: TS-01M19V6VYXDRMGVQ8XZKAXPR49
directories:
  - apps/desktop
  - apps/mobile
  - packages/features
projects:
  - rahrow
---

Add desktop, Android, and iOS adapters that select usable IPv4/IPv6 addresses from the active underlying physical interface, excluding loopback, unspecified, and tunnel interfaces. Surface the value through a shared network identity port and omit it when selection is ambiguous.
