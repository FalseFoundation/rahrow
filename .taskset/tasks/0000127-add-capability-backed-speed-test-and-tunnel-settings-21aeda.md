---
id: 21aeda
title: Add capability-backed speed test and tunnel settings
status: todo
priority: high
risk: high
createdAt: 2026-08-30 18:32 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - settings
  - native
  - speed-test
parent: "542944"
directories:
  - packages/core
  - packages/features
  - apps/desktop
  - apps/mobile
projects:
  - rahrow
  - rahrow-phase-05-integration-and-hardening
---

## Purpose

Add truthful speed-test and tunnel controls based on the active engine and operating-system capabilities. Unsupported controls must not render.

## Reference UI inventory

The speed-test reference showed:

- Test Method: Connection, TCP, or ICMP.
- Timeout slider from 1 to 10 seconds.
- Concurrent Connections slider from 1 to 15.
- Test endpoint/provider selection, shown as Cloudflare.

The tunnel reference showed:

- Persist Tunnel.
- Use Xray TUN.
- Allow Insecure.
- Prefer IPv6.
- Memory limit slider around 25-50 MB, shown at 30 MB.
- XHTTP optimization mode, shown as Normal.
- Stop on sleep.
- Mux.
- Enforce Routes.
- Include All Networks.
- Include Local Networks.
- Include APNs.
- Include Cellular Services.
- A warning that route-inclusion options may reduce connection speed and require reconnecting.

## RahRow behavior

### Speed test

- Use the product term Speed test everywhere; never Ping as the generic action label.
- Define methods semantically:
  - Connection: test through the selected profile using the active engine.
  - TCP: establish a timed TCP connection to a configurable host/port.
  - ICMP: render only when a native capability confirms it is available; do not emulate ICMP with HTTP.
- Persist validated timeout and concurrency settings. Start with conservative product defaults rather than copying V2Box values blindly.
- Endpoint choices must be named test targets with host, port/scheme, ownership, and privacy documentation. Support a validated custom endpoint.
- Apply bounded concurrency, cancellation, per-profile progress, aggregate progress, and retry policy.
- Sort by last successful speed-test latency while keeping failed/untested entries deterministic.
- Never send profile credentials to the speed-test endpoint.

### Tunnel

- Persist Tunnel and Stop on sleep require lifecycle adapters per OS.
- Prefer IPv6 must map to engine/native routing behavior and report unsupported states.
- Memory limit and XHTTP optimization render only when the active engine exposes safe supported settings and documented ranges.
- Mux must remain per profile or engine policy as appropriate and must not be forced on incompatible protocols.
- Enforce Routes and network-inclusion controls require native adapters and reconnect-on-change handling.
- Include APNs and Include Cellular Services are Apple-only and must never appear on Android or desktop.
- Include Local Networks requires an explicit LAN-access explanation and leak/security tests.
- Include All Networks needs platform-specific semantics and must not be approximated by an unrelated engine route.
- Display a reconnect-required indicator and apply changes atomically on reconnect.

## Explicit exclusions

- Do not add Use Xray TUN. Engine selection plus VPN/TUN mode is the source of truth.
- Do not add global Allow Insecure. It remains a per-profile TLS setting.
- Do not display unsupported rows in a permanently disabled state.
- Do not claim ICMP, memory enforcement, sleep handling, or route inclusion based solely on JavaScript availability.

## Native work

- macOS/iOS: Network Extension route flags, APNs/cellular inclusion, sleep and reconnect lifecycle.
- Android: VpnService route and app lifecycle behavior; hide Apple-only settings.
- Windows: service/Wintun route application and sleep/resume.
- Linux: privileged TUN/service route application and suspend/resume.
- Desktop proxy mode: omit VPN-only settings.

## Acceptance criteria

- Capability matrix tests assert visibility for every OS, mode, and engine.
- Settings persistence is versioned and migrated.
- Changing reconnect-required settings never partially mutates an active tunnel.
- Speed tests remain cancellable and UI responsive with large subscriptions.
- Native integration tests cover route leaks, LAN inclusion/exclusion, sleep/resume, IPv4/IPv6, and reconnect.
- UI includes accessible labels, current numeric values, units, descriptions, and loading/error feedback.


Screenshot-verification clarifications

- Connection test means a full HTTP round trip through the selected profile and active engine to the configured endpoint; distinguish it from a raw TCP connect and ICMP echo.
- Use the shared full-width nested-page shell: unified header, viewport-level safe areas, bottom-left back affordance, and no root tab bar or persistent connect/latency overlay.
- Model dependencies among Include All Networks, Include Local Networks, APNs, and Cellular Services. Platform-unsupported options are hidden; a supported but conditionally unavailable child may be disabled only with a specific explanation.
- Enforce Routes defaults off and, when enabled, gives tunnel routes precedence over locally defined routes.
- XHTTP optimization is experimental/capability-gated and must repeat the reference warning that it can trade stability for memory behavior.
- Reconnect-required changes are staged as pending, validated together, then saved/applied atomically. On reconnect failure restore the previously confirmed settings and effective native state; never leave partial live mutation.
- Test the full sleep/wake state machine: intentional stop, persisted intent, wake reconnection eligibility, stale native cleanup, and user-visible failure recovery.
