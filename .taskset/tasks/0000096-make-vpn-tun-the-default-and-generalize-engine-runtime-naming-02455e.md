---
id: 02455e
title: Make VPN/TUN the default and generalize engine runtime naming
status: doing
priority: urgent
risk: high
createdAt: 2026-08-27 14:47 UTC
updatedAt: 2026-09-02 03:51 UTC
labels:
  - vpn
  - architecture
  - engine
related:
  - 9a604d
parent: 713ce0
files:
  - apps/desktop/src/lib/app-runtime.ts
  - apps/desktop/src-tauri/src/main.rs
directories:
  - apps/desktop
  - apps/mobile
  - packages/core
  - packages/engine
projects:
  - rahrow-production
  - rahrow-phase-05-integration-and-hardening
---

VPN remains the persisted default, but no platform may report it supported until a real OS-owned tunnel provider is installed and tested. Remove the macOS AppleScript/nohup experiment. Desktop and mobile connection orchestration must consult the platform VPN capability before engine launch and fail closed without silently selecting proxy. Production completion requires child tasks for the engine-neutral provider contract, macOS, iOS, Android, Windows, Linux, and security/reliability gates. Research source: docs/research/vpn-tun-engine-bundling.md.
