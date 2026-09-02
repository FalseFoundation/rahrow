---
id: TS-01M1A44HEBCGYGKRTH4PJV823Z
title: Verify complete screenshot-derived product program across platforms
status: todo
priority: high
risk: high
createdAt: 2026-08-30 20:00 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - validation
  - screenshot-spec
  - cross-platform
dependsOn:
  - TS-01M19Z4BHKVCJKSEFCBGAT9K0S
  - TS-01M19Z4BT4GMWQ214K6MANHK8C
  - TS-01M19Z4C235WSDN3CRTEVGJ3BK
  - TS-01M19Z4CA5JGYJF3PWNKMWJ5MC
  - TS-01M19Z4CJE17HHTA5KX1Q916E3
  - TS-01M19ZHPJEJ7Z0448NKQF7MXTD
  - TS-01M19ZHPVAF0C45ED6DES76YF8
  - TS-01M1A43H8YRCDGED2B907ZCM1P
  - TS-01M1A43HK5X3ZZ3F2PS8Z8V5ZG
  - TS-01M1A48HJEP22S8VR2QYVGGFXQ
parent: TS-01M19V6VYXDRMGVQ8XZKAXPR49
directories:
  - apps
  - packages
projects:
  - rahrow
  - rahrow-phase-06-verification-and-release-gates
---

Purpose

Act as the release gate for the complete screenshot-derived Settings, subscription, sharing, editor, and performance program. The screenshots are reference evidence only; the bodies of the dependency tasks are the durable source of truth. Verification must use RahRow's product language, visual system, capability model, and security posture rather than pixel-copying V2Box.

Coverage matrix

- Settings root, unified page shell, safe areas, search, subpage back navigation, appearance entry, reset scopes, About/version/legal/integration rows.
- Speed Test Settings: Connection/TCP/ICMP semantics, timeout, concurrency, endpoint, cancellation, and platform capabilities.
- Tunnel Settings: persistence, engine/TUN behavior, IPv6, memory/resource policy, XHTTP optimization, sleep lifecycle, mux, route precedence, all/local/APNs/cellular network inclusion, reconnect requirements.
- Routing: geo assets, domain strategy, route-only sniffing, Apple-direct preset, fragmentation, ordered rules, enable/edit/add/remove, matcher/action compilation.
- Subscription Settings: background update, announcements, privacy-safe request identity, User-Agent, locking/editing.
- Proxy sharing: interface selection, visible LAN address, SOCKS/HTTP ports, authentication/risk, lifecycle, firewall/native capability.
- Advanced concepts: on-demand connection, encrypted backup/restore, and Wi-Fi plus cellular bonding are implemented only through separately approved architecture and native capabilities; otherwise absent.
- DNS: canonical policy, resolver forms, engine compilation, routing integration, native application/restoration, leak safety, and diagnostics.
- Subscription editor and profile editor: explicit fields, protocol/transport/TLS-Reality forms, advanced security fields, raw JSON workspace, canonical conversion and loss reports.
- Global share drawer and truthful subscription URL export.
- Responsive background import/refresh and large-list performance behavior.

Cross-cutting verification

1. Build a platform/engine matrix for desktop macOS/Windows/Linux and mobile iOS/Android. For each setting, record visible, hidden, or supported state and link to its capability implementation. Disabled is used only for temporarily unavailable supported actions; unsupported features are absent.
2. Verify a single visual ecosystem: dark default theme, shared tokens, connected yellow-to-green primary transition, unified icons/headers/search/drawers, safe areas, full-width subpages, empty-state centering/icons/actions, Sonner toasts, skeleton/spinner behavior, reduced motion, keyboard/touch/screen-reader access.
3. Verify privacy/security boundaries: no hardware fingerprint by default, secret/token redaction, safe external/deep links, encrypted sensitive persistence, explicit LAN exposure, reset cleanup, raw JSON validation, and no credentials in logs.
4. Verify state authority: canonical profile/subscription ownership, selected profile remains highlighted within its subscription, background refresh preserves old usable data, settings migrations are versioned, and native/effective state is distinguishable from requested state.
5. Run unit, integration, golden adapter, UI, native lifecycle, performance, and accessibility checks defined by every dependency. Record commands and artifacts.
6. Test small and large datasets, network loss, cancellation, partial failures, app restart, engine switch, reconnect, sleep/wake, interface change, and reset during an active tunnel.
7. Review all copy so Ping is called Speed test where it refers to connection latency; DNS resolver testing stays explicitly named. Do not preserve V2Box brand names, premium labels, ornamental window controls, or unsupported protocol/settings claims.
8. Confirm no implementation depends on screenshot availability: every tested expectation must cite a Taskset requirement or code-level contract.

Exit criteria

- All dependency acceptance criteria pass or have an explicit, separately tracked blocker.
- No untriaged visual, capability, data-loss, privacy, native lifecycle, or performance regression remains.
- Taskset doctor passes.
- The parent can close only after this task and the earlier connection/diagnostics verification task complete.
