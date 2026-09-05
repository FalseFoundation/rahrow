---
id: TS-01M1FD3JWFFV89RPX8R97KTFR3
title: Separate VPN, system proxy, and LAN proxy sharing settings
status: done
priority: high
risk: high
createdAt: 2026-09-01 21:13 UTC
updatedAt: 2026-09-02 17:14 UTC
labels:
  - cross-platform-hardening
  - settings
  - information-architecture
  - vpn
  - system-proxy
  - lan-sharing
  - routing
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
related:
  - TS-01M19Z4CJE17HHTA5KX1Q916E3
  - TS-01M19Z4C235WSDN3CRTEVGJ3BK
  - TS-01M1A43H8YRCDGED2B907ZCM1P
  - TS-01M1AP3WDCN9VWPAVCHXB76CS6
parent: TS-01M1FCY8ZHNE0E843BHX893G1F
directories:
  - packages/core/src/settings
  - packages/features/src/settings
  - packages/features/src/home
  - packages/engine
  - apps/cli
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-uiux
  - rahrow-cross-platform-hardening
  - rahrow-phase-02-light-ui-and-copy
---

## Taxonomy

Use distinct product terms:
- VPN/TUN: registered device tunnel and its VPN-only settings.
- System proxy mode: RahRow configures this device's OS proxy to the local engine endpoint.
- LAN proxy sharing: optional listener exposure to other devices; never label this merely Proxy settings.

Group each concern under one registry item/subpage. Put local system-proxy endpoint/port and restoration behavior under System proxy; sharing interface, address, authentication, firewall, clients, SOCKS/HTTP ports, and exposure warning under LAN proxy sharing; tunnel provider, routes, DNS/leak/on-demand settings under VPN/TUN.

Routing is engine traffic policy and may apply in VPN and system-proxy modes. Determine support from engine+mode capability semantics; do not hide it from VPN merely because of a screen assumption, and do not show controls whose chosen mode/engine ignores them.

## Acceptance

Settings registry, search, Home copy, CLI help/config, diagnostics, migrations, and docs use the same terms. Capability tests cover Android, iOS, macOS, Linux, Windows, CLI, every engine/mode, and cleanup. LAN sharing works only on explicitly supported native adapters and is hidden otherwise.
