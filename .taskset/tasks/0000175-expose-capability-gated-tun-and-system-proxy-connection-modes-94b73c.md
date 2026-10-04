---
id: 94b73c
title: Expose capability-gated TUN and system-proxy connection modes
status: done
priority: urgent
risk: high
createdAt: 2026-08-31 01:14 UTC
updatedAt: 2026-09-14 00:50 UTC
labels:
  - connection-mode
  - vpn
  - system-proxy
  - engines
  - platform-capability
related:
  - b9f868
  - 7eaa15
  - a2fd7f
parent: 02455e
files:
  - packages/core/src/connection/connection-mode.ts
  - packages/core/src/storage/json-store.ts
  - packages/core/src/runtime/proxy-engine.ts
  - packages/features/src/settings/Settings.tsx
  - packages/features/src/settings/useSettings.ts
  - packages/features/src/home/home-model.ts
  - apps/desktop/src/lib/app-runtime.ts
  - apps/desktop/src/lib/platform-capabilities.ts
  - apps/mobile/src/lib/app-runtime.ts
directories:
  - packages/core/src/connection
  - packages/core/src/platform
  - packages/core/src/storage
  - packages/engine
  - packages/features/src/settings
  - packages/features/src/home
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-production
  - rahrow-phase-05-integration-and-hardening
---

## Purpose

Let users select between the default VPN/TUN mode and an explicit socket-based system-proxy mode when, and only when, the selected engine and current platform can implement that mode truthfully.

In product copy, call the second mode System proxy and explain that it uses the engine local SOCKS endpoint. Do not label a local SOCKS listener itself as a VPN.

## Capability model

- Keep VPN/TUN as the persisted default.
- Resolve availability from the intersection of selected engine capabilities, bundled runtime availability, platform/OS integration, permissions or entitlements, and build configuration.
- Model connection modes in a shared contract; do not scatter engine-id and platform string checks through Settings or Home.
- Hide modes that are structurally unsupported. A temporarily unavailable supported mode may be shown only with a specific actionable explanation.
- Changing engine recomputes valid modes. If the saved mode is incompatible, require an explicit user choice or fail closed; never silently switch modes during connect.
- Switching mode or engine while connected must use a deliberate disconnect/reconnect flow with cancellation and rollback.

## Runtime behavior

- TUN must use the registered OS VPN/tunnel provider. Starting a SOCKS inbound is not evidence that TUN works.
- System proxy starts the selected engine, waits for its local endpoint, captures the previous OS proxy state, activates the OS proxy, and restores the prior state on disconnect, failure, crash recovery, and app shutdown.
- Roll back the engine if proxy activation fails. Do not leave routes, DNS, proxy settings, ports, or child processes behind.
- Mobile platforms must not advertise system proxy unless a real supported OS integration exists.
- Release builds may expose only modes whose required providers and engine artifacts are bundled.

## UI and persistence

- Show a single accessible Connection mode chooser with VPN/TUN and System proxy labels plus concise descriptions.
- Keep local SOCKS port configuration subordinate to System proxy and validate the range and conflicts.
- Home displays the effective mode and actionable unavailability reason.
- Persist the selected mode through the validated settings store with migration from existing vpn/proxy values.

## Acceptance criteria

- Matrix tests cover every supported engine x platform x build x provider combination.
- TUN stays the default and unsupported TUN builds fail closed without proxy fallback.
- Mode and engine changes during an active session are atomic and restore the prior effective state after failure.
- Desktop integration tests cover proxy activation rollback and restoration; native TUN tests run at platform boundaries.
- Settings hides impossible modes, explains temporary failures, and remains identical across desktop/mobile shared UI.
- Release verification rejects an advertised mode when its engine artifact, entitlement, native provider, or system-proxy adapter is missing.
