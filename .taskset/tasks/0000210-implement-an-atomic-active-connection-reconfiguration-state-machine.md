---
id: 0000210-implement-an-atomic-active-connection-reconfiguration-state-machine
title: Implement an atomic active-connection reconfiguration state machine
status: done
priority: urgent
risk: high
createdAt: 2026-09-01 21:13 UTC
updatedAt: 2026-09-02 17:14 UTC
labels:
  - cross-platform-hardening
  - connection-lifecycle
  - reconfiguration
  - profiles
  - engines
  - vpn
  - system-proxy
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
related:
  - 0000175-expose-capability-gated-tun-and-system-proxy-connection-modes
  - 0000102-add-vpn-leak-lifecycle-and-engine-switch-release-gates
parent: 0000203-harden-reported-behavior-across-every-rahrow-platform
directories:
  - packages/core/src/connection
  - packages/core/src/runtime
  - packages/engine
  - packages/features/src/home
  - packages/features/src/profiles
  - packages/features/src/settings
  - apps/cli
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-core
  - rahrow-cross-platform-hardening
  - rahrow-phase-03-product-state-and-data
---

## Objective

Model every active-session change to selected profile, engine, connection mode, routing/DNS settings, local port, subscription refresh/removal, or native capability as a serialized transaction.

## Rules

Separate desired configuration from effective active configuration and surface both while they differ. Classify changes as no-op, next-connect-only, live-reload when explicitly supported, or stop/cleanup/reinitialize/start. Never mutate the active engine identity in place. Disable or queue conflicting actions; support cancellation only at safe boundaries.

For VPN→system proxy and system proxy→VPN, stop and verify the old integration first. Capture/restore prior OS proxy state, remove RahRow-applied proxies, routes, DNS, firewall/listener state, TUN providers, and processes before success. On start failure, either restore the previous known-good session atomically or end disconnected with precise recovery; never claim the new configuration while the old one owns traffic.

## UX and tests

Expose Preparing, Stopping old connection, Restoring device settings, Initializing engine, Applying VPN/System proxy, Verifying, and rollback/error states without optimistic false success. Table-driven tests cover connected/disconnected/error states × profile/engine/mode/settings changes, repeated rapid edits, app exit/crash/resume, external OS changes, and every supported platform/CLI matrix cell.
