# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary user already has VPN connection links or a provider subscription and wants one trustworthy client for using those connections across desktop and mobile devices. A secondary contributor-facing interface exposes the same core behavior through the CLI.

## Product Purpose

RahRow lets people import, save, choose, test, and use VPN connection profiles without operating proxy engines themselves. Success means a person can bring an existing connection, understand whether their platform is ready, connect or disconnect deliberately, and encounter actionable diagnostics rather than an unsafe or misleading fallback.

RahRow does not sell VPN access, issue accounts, or provide connection credentials.

## Positioning

RahRow is an open-source, privacy-conscious, cross-platform VPN client that ships selectable Xray and sing-box engines inside native distributables. It treats native VPN/TUN as the default and fails closed when required platform capabilities are missing instead of silently degrading to a local or system proxy.

## Operating Context

Users usually receive an individual VLESS, VMess, or Trojan link, a QR code, or a subscription containing multiple connections. They import those details, choose a saved profile and engine, optionally test responsiveness, and connect. Desktop users may deliberately choose system proxy as a fallback. Mobile usage remains VPN-only.

The product spans macOS, Windows, Linux, iOS, and Android while keeping its core concepts and shared interface familiar across devices. Native adapters own operating-system consent, tunnel creation, routing, DNS, upstream-loop prevention, and teardown.

## Capabilities and Constraints

- Implemented profile support includes VLESS, VMess, and Trojan, with TLS, REALITY, VLESS Vision, uTLS, WebSocket, TCP, gRPC, and HTTP Upgrade where applicable.
- Users can import individual links or subscriptions, store and switch profiles, connect and disconnect, inspect status, and probe a connection. QR import or sharing is available where the host supports it.
- Xray and sing-box are the first selectable engines. The engine owning an active connection remains responsible for stopping it.
- VPN/TUN is the persisted default. Proxy mode is explicit and never presented as VPN.
- Desktop system-proxy mode activates only after its bundled engine is ready and restores the prior proxy state on disconnect. Mobile never falls back to system proxy.
- Production releases must be platform-native, installable end-user artifacts containing every advertised engine. They do not depend on PATH-installed tools and do not download executable engines on first launch.
- Missing tunnel providers, entitlements, native libraries, or privileges fail closed with diagnostics before an engine is presented as an active VPN.
- Shadowsocks, Hysteria/Hysteria2, SSH, and V2Ray JSON are roadmap commitments and must not be advertised as supported before their full profile, import/export, engine, and integration-test paths are complete. Ping Tunnel and DNSTT require additional engine adapters.
- The project is under active development. Public-release readiness and some platform capabilities remain incomplete.
- The CLI is currently a contributor interface rather than a separately published end-user artifact.

## Brand Commitments

The product name is RahRow. The official mark is the white RahRow logo, used on a static black application-icon background for consistent contrast. Product language should be direct about readiness and limitations: never call a local SOCKS listener a VPN, imply that RahRow provides VPN access, or hide missing native capabilities.

The product is open source under the MIT License. Engine and native-runtime licensing constraints remain release gates and must be represented accurately.

## Evidence on Hand

- Product overview, supported capabilities, production contract, connection modes, and roadmap: `README.md`
- Official logo and generated desktop icon source: `packages/static/src/images/rahrow-logo-white-filled.svg` and `apps/desktop/src-tauri/icons/`
- Desktop platform and bundling contract: `apps/desktop/README.md`
- Mobile platform boundaries and native-runtime readiness: `apps/mobile/README.md`
- CLI behavior and current distribution status: `apps/cli/README.md`
- Shared domain responsibilities: `packages/core/README.md`
- Engine adapter and runtime contract: `packages/engine/README.md`
- Security reporting and sensitive failure categories: `SECURITY.md`

No testimonials, customer logos, usage benchmarks, pricing, signed-installer claims, or production-readiness claims are currently established and future work must not fabricate them.

## Product Principles

1. Make the connection lifecycle understandable: users should know what will run, what mode is active, and what happened when an action fails.
2. Fail closed at capability boundaries; never trade safety or truthfulness for the appearance of a successful connection.
3. Ship the complete advertised runtime so end users do not have to install, locate, or fetch engines themselves.
4. Keep profiles, settings, and connection concepts consistent across interfaces while respecting each operating system's native consent and tunnel boundaries.
5. Advertise only capabilities that are implemented through parsing, storage, engine configuration, packaging, and integration verification.
