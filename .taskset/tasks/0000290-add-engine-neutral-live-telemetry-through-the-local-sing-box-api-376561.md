---
id: "376561"
title: Add engine-neutral live telemetry through the local sing-box API
status: todo
priority: medium
owner: junkieshuffle
risk: high
createdAt: 2026-10-07 08:32 UTC
updatedAt: 2026-10-07 08:32 UTC
labels:
  - diagnostics
  - engine
  - security
related:
  - eb5838
  - 21aeda
  - d9f98e
  - "866e12"
parent: "542944"
directories:
  - packages/core/src/runtime
  - packages/engine/src
  - packages/features/src/diagnostics
  - apps/desktop
  - apps/mobile
  - apps/cli
projects:
  - rahrow
  - rahrow-engine
  - rahrow-phase-05-integration-and-hardening
---

## Outcome

Add an optional engine-neutral live telemetry capability, implemented first through the local sing-box API, so RahRow can report real engine state and tests beyond process existence and raw TCP reachability.

## Why this fills a gap

RahRow currently supervises engine processes, buffers stdout/stderr, and performs endpoint TCP probes. It has no typed adapter for live connection tracking, traffic counters, outbound-group state, or engine-executed URL tests. The sing-box API provides those signals in supported runtimes.

## Scope

- Define a small optional EngineTelemetry port in @rahrow/core for only product-owned observations: health, bounded traffic totals/rates, bounded active-connection summaries, and engine-executed URL-test results.
- Implement the sing-box adapter inside @rahrow/engine; keep protobuf/gRPC and sing-box message types out of core and shared UI.
- Start the API on a loopback-only ephemeral endpoint with a cryptographically random per-session bearer secret.
- Disable dashboard serving, remote-control exposure, wildcard CORS, private-network access, and automatic dashboard downloads.
- Redact secrets, destinations, and user-identifying connection fields from logs and diagnostics; enforce bounds, sampling, cancellation, reconnect cleanup, and stale-session rejection.
- Capability-gate every consumer. Xray and native runtimes without equivalent verified telemetry retain existing behavior without false parity.
- Feed only useful bounded state into existing Diagnostics and speed-test flows; do not copy or embed sing-box-dashboard.
- Verify the pinned bundled sing-box version and build expose the required API before enabling the capability.

## Acceptance criteria

- Core and feature code depend only on EngineTelemetry, never sing-box API types.
- No API listener is reachable off-device or without its per-session secret.
- Stop, crash, engine switch, app restart, and failed startup revoke the prior endpoint and credentials.
- Telemetry failures degrade to an explicit unavailable state without affecting the tunnel.
- Tests cover authentication, loopback binding, bounds, redaction, cancellation, stale sessions, unavailable engines, and lifecycle cleanup.
- Installed-artifact verification confirms no dashboard archive or first-run executable/content download is introduced.

## Changeset

- Expected packages: @rahrow/core (minor), @rahrow/engine (minor), @rahrow/features (minor), @rahrow/desktop (minor), @rahrow/mobile (minor only when native wiring is delivered), and @rahrow/cli (minor when exposed).
- Release-note intent: supported sing-box sessions provide secure, bounded live engine diagnostics and engine-executed tests.
- Reconcile the fixed application group and omit mobile implementation claims until the native adapter is verified.

## References

- https://github.com/SagerNet/sing-box/blob/testing/docs/configuration/service/api.md — official API service and authentication behavior.
- https://github.com/SagerNet/sing-box-dashboard — behavior reference only; not a RahRow dependency.
- Task eb5838 — existing lifecycle and log diagnostics.
- Task 21aeda — capability-backed connection and speed-test settings.
