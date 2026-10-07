---
id: ca9630
type: decision
title: Use V2Fly as a compatibility reference, not a third engine
status: accepted
owner: junkieshuffle
createdAt: 2026-10-07 12:32 UTC
updatedAt: 2026-10-07 12:32 UTC
labels:
  - architecture
  - engine
related:
  - 2afaf7
  - "667788"
  - b876a1
  - 9a604d
directories:
  - packages/core
  - packages/engine
  - engines
projects:
  - rahrow
  - rahrow-engine
---

## Decision

RahRow will not bundle v2ray-core as a third proxy engine now. V2Fly remains an upstream compatibility and conformance reference for V2Ray formats, protocols, routing semantics, subscription containers, and test fixtures.

Raw engine documents are engine-affine. Raw V2Fly JSON v4/v5 must not be passed to Xray merely because the projects share ancestry and overlapping concepts. RahRow may normalize a V2Fly input into its canonical profile model only when every required field is representable; otherwise import must return an explicit loss or incompatibility result.

## Rationale

- RahRow already has Xray and sing-box engine boundaries, so v2ray-core would mostly duplicate protocol and routing coverage while multiplying native packaging, lifecycle, security, licensing, and installed-device verification.
- V2Fly is active, MIT-licensed, and currently documents VLESS, VMess, Trojan, Shadowsocks, Shadowsocks 2022, Hysteria2, WireGuard, routing, observatory, subscriptions, and a Linux-only TUN service.
- Distinct V2Fly value lies chiefly in format compatibility and upstream semantics. Its Linux-only TUN service does not solve RahRow's cross-platform Apple/Android VPN integration.
- Xray was forked from v2fly-core and has accumulated its own extensions; ancestry does not guarantee configuration compatibility.

## Reconsider bundling only if

- a measured user cohort requires exact V2Fly behavior that neither Xray nor sing-box can provide;
- the missing behavior cannot be delivered safely through canonical import/conversion;
- desktop and native mobile runtime paths, artifact size, licensing notices, updates, rollback, and installed-device tests are funded as a complete engine capability.

## Consequences

- Task 2afaf7 owns V2Fly JSON/subscription compatibility classification and fixtures.
- Existing Xray and sing-box release gates remain unchanged.
- V2Fly's subscription manager, TUN service, and application architecture are references, not runtime dependencies.
- No new protocol is advertised solely because v2ray-core implements it.

## References

- https://github.com/v2fly/v2ray-core
- https://github.com/v2fly/v2ray-core/releases
- https://www.v2fly.org/en_US/
- https://www.v2fly.org/en_US/config/overview.html
- https://www.v2fly.org/en_US/v5/config/proxy.html
- https://www.v2fly.org/en_US/v5/config/service/tun.html
- https://www.v2fly.org/en_US/v5/config/service/subscription.html
- https://github.com/XTLS/Xray-core
