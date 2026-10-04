---
id: cb2f8b
title: Correct network identity labels and capability contract
status: done
priority: high
risk: high
createdAt: 2026-08-30 17:24 UTC
updatedAt: 2026-08-30 20:25 UTC
labels:
  - home
  - network
  - native
  - privacy
parent: "542944"
directories:
  - packages/features/src/home
  - packages/features/src/app
  - apps/desktop
  - apps/mobile
projects:
  - rahrow
---

Goal: stop presenting loopback proxy listener and server hostname as device/public IP addresses. Acceptance: local proxy listener and remote server endpoint are labeled accurately immediately; a platform network-identity port exposes LAN/local address only where natively known; public/egress IP is shown only from an explicit external observer and otherwise omitted. Document privacy and native requirements for desktop, Android, and iOS. Validation: Home model/render tests and adapter tests.
