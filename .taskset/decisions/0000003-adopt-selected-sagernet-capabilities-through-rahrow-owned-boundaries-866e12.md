---
id: "866e12"
type: decision
title: Adopt selected SagerNet capabilities through RahRow-owned boundaries
status: accepted
owner: junkieshuffle
createdAt: 2026-10-07 08:32 UTC
updatedAt: 2026-10-07 08:32 UTC
labels:
  - architecture
  - engine
related:
  - 8c9114
  - "376561"
  - d9f98e
  - b2b50b
  - aab45b
  - bf22cf
directories:
  - packages/engine
  - engines
  - apps/mobile
projects:
  - rahrow
  - rahrow-engine
---

## Decision

RahRow will adopt only two SagerNet capability families now:

1. sing-geosite and sing-geoip as versioned routing-data inputs behind a RahRow-owned portable routing model.
2. The local sing-box API as an optional engine adapter for bounded telemetry and engine-executed tests.

Official SagerNet Android, Apple, desktop, and dashboard applications are implementation and behavior references only. RahRow will not embed their UI or make their application architecture a runtime dependency.

## Deferred without tasks

OpenVPN, OpenConnect, NaiveProxy/cronet-go, AnyTLS, ShadowTLS, Snell, and other additional protocols remain deferred until product demand, canonical profile semantics, import/export behavior, UI, engine capability mapping, security review, licensing, and tests justify a complete RahRow capability. Runtime support alone is not sufficient.

sing-cloudflared and Tailscale are outside the current consumer VPN/proxy scope.

## Rejected as direct dependencies

RahRow will not directly adopt sing, sing-tun, sing-mux, sing-quic, protocol implementation packages, quic-go, netlink, wireguard-go, bbolt, or fswatch. They are Go implementation details or transitive engine dependencies and would violate the current external-runtime boundary without a separately approved native requirement.

asc-go is not adopted because the existing release workflow does not justify a second Go-based App Store automation path.

## Boundaries and consequences

- Portable domain types remain independent of Xray and sing-box configuration formats.
- SRS, protobuf, gRPC, and libbox details stay inside engine/native adapters.
- Release artifacts bundle every advertised baseline asset and never download executable code on first launch.
- Optional asset updates are data-only, verified, bounded, atomic, and recoverable.
- The sing-box API binds only to loopback with a per-session secret; dashboard serving and automatic dashboard downloads remain disabled.
- Mobile client source may inform tests for TUN ownership, socket protection, lifecycle, and cleanup, but linked/copy-derived use remains behind existing GPL and store-distribution review.
- A new protocol receives a task only when it closes a stated product gap and can satisfy the full RahRow capability matrix.

## Related delivery

- Task 8c9114 and children 08926e, ec4859, dab831, 032ce0 deliver portable routing and geo assets.
- Task 376561 evaluates and implements secure optional sing-box telemetry.
- Existing tasks d9f98e, b2b50b, aab45b, and bf22cf remain the native runtime and installed-device gates.

## References

- https://github.com/SagerNet/sing-geosite
- https://github.com/SagerNet/sing-geoip
- https://github.com/SagerNet/sing-box/blob/testing/docs/configuration/service/api.md
- https://github.com/SagerNet/sing-box-for-android
- https://github.com/SagerNet/sing-box-for-apple
- https://github.com/SagerNet/sing-box-for-desktop
- https://github.com/SagerNet/sing-box-dashboard
- docs/research/engine-licensing-store-distribution.md
- docs/research/vpn-tun-engine-bundling.md
