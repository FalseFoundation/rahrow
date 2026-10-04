---
id: 7793d7
type: research
title: RahRow working-product gap against Happ and v2rayNG
status: draft
createdAt: 2026-10-01 11:09 UTC
updatedAt: 2026-10-01 11:09 UTC
---

# RahRow working-product gap against Happ and v2rayNG

Date: 2026-10-01

## Question

Does RahRow already constitute a working end-user VPN/proxy product, and if not, what is the shortest credible path to one?

## Executive answer

RahRow has most of the reusable product implementation, but it does **not yet have a verified working end-user product** under its own production contract.

The codebase contains the full application-shaped path—configuration import, subscription refresh, durable storage, profile selection, Xray/sing-box configuration generation, shared UI, desktop sidecars, Android `VpnService`, iOS Network Extension control code, diagnostics, and connection lifecycle. The automated suite is healthy: `pnpm test` passed 1,096 tests with 8 skipped on 2026-10-01.

The release claim still fails at the native and distribution boundary:

- Desktop VPN is deliberately unavailable until a registered OS tunnel provider exists. macOS system-proxy fallback also has an open critical end-to-end regression.
- Android is the closest target. Its debug APK and native providers have been assembled, but the previously reported sing-box TUN crash is only contained in code and remains unverified on an installed device. Xray's Android TUN file-descriptor adapter is still tracked as in progress.
- iOS has a real `NETunnelProviderManager`/packet-tunnel shape, but the Apple runtime lock is incomplete, signing and Network Extension entitlements remain external gates, and `native:verify` currently fails.
- Windows and Linux have no production VPN service/provider yet.
- Installed-artifact leak, cleanup, crash, upgrade, and uninstall evidence is still missing across platforms.
- Licensing/attribution and public product-policy documentation remain release work.

The shortest credible product is therefore **an Android-only alpha, initially advertising only the engine and protocol cells proven on a physical device**. One successful installed-device run is the decisive next evidence step; it is not another architecture or UI pass.

## What the references establish as the market baseline

### Happ

Happ is not merely an engine wrapper. Its public contract combines:

- installable releases for Windows, macOS, Linux, Android, iOS, Android TV, and tvOS;
- bundled Xray-based connectivity;
- VLESS, VMess, Trojan, Shadowsocks, SOCKS5, and Hysteria2;
- manual entry, URL, clipboard, QR, deep-link, and subscription acquisition;
- server/subscription selection, update, ping, routing, sharing, and LAN proxying;
- user-facing system requirements, error help, privacy policy, terms, and support contacts.

The latest desktop release history also shows the operational depth of a mature client: signed Windows binaries, TUN repair, sleep/wake recovery, DNS-leak fixes, prior proxy restoration, per-app routing, and cleanup of stray helpers. These are lifecycle and distribution capabilities, not screen features.

Happ's provider-facing features—encrypted/limited/HWID links, provider IDs, TV transfer APIs, server metadata, and app-management links—are useful competitive extensions, but they are not required for RahRow's first working product. Its privacy policy is also not a model to copy blindly: it says VPN payloads are not collected, while crash/diagnostic analytics and some device/subscription metadata may be transmitted.

### v2rayNG

v2rayNG is the stronger implementation reference for Android. It is an Android VPN client that embeds native V2Ray/Xray components, includes `hev-socks5-tunnel`, requests OS VPN permission, and ships signed release artifacts. Its main lesson for RahRow is architectural and operational: a mobile client is working only when the packaged native runtime, OS-owned tunnel, socket bypass, permission flow, and lifecycle work together on installed devices.

### HexaSoftwareDev

The organization has only three visible repositories. The relevant one is the Pingtunnel server/fork ecosystem; it is not a general Xray client reference. It supports RahRow's decision to treat Ping Tunnel as a later, separate engine adapter rather than part of the minimum product.

## RahRow capability assessment

| Capability | Repository evidence | Product verdict |
| --- | --- | --- |
| VLESS/VMess/Trojan import and round-trip | Core schemas, protocol parsers, profile workflow, and completed Taskset work | Implemented and tested |
| Subscription fetch/decode/refresh | `packages/core/src/subscription/subscription-import.ts` and shared import UI | Implemented and tested |
| Durable profiles/settings | Desktop Tauri document store and mobile Capacitor Preferences store | Implemented |
| Shared product UI | `packages/features`, mounted by thin desktop/mobile shells | Implemented |
| Engine abstraction/config generation | Xray and sing-box adapters, runtime manifests, checksum enforcement | Implemented in code |
| Desktop bundled engines | Pinned Xray and sing-box sidecars are staged locally | Present, but installed release evidence is incomplete |
| Desktop system proxy | Explicit fallback with rollback logic | Not currently product-ready; critical macOS regression is open |
| Desktop VPN/TUN | Fails closed by design without native provider | Not implemented for production on macOS/Windows/Linux |
| Android VPN | `VpnService`, engine-specific processes, full-route TUN, native providers, HEV option | Closest candidate; real-device proof remains blocked |
| iOS VPN | Manager/control plane and packet-tunnel extension code exist | Not releasable; runtime lock, entitlements, signing, and device proof missing |
| Latency/diagnostics | TCP latency probe and native diagnostics | Implemented; not equivalent to bandwidth testing |
| QR/share/native actions | Shared flows and some native adapters exist | Cross-platform installed-artifact proof is incomplete |
| Release compliance | Runtime/license machinery and tasks exist | Own-code license and artifact-specific notices remain open blockers |
| Public product/legal docs | Root README and internal research exist | Privacy policy, terms, support/runbook, and truthful per-platform requirements are not yet published |

## Why this is not yet a working product

RahRow's own architecture requires a self-contained platform artifact, a real registered VPN facility, fail-closed capability reporting, bundled advertised engines, and verified cleanup. Passing unit/integration tests does not establish those conditions.

Current concrete blockers are already represented in Taskset:

- `b2b50b` — code hardening and APK verification completed, but physical Android lifecycle/traffic tests remain unavailable.
- `aab45b` — still doing.
- `ad2ef5` — todo, critical.
- `0000098`, `0000100`, and `0000101` — macOS, Windows, and Linux registered tunnel providers/services blocked.
- `bf22cf` — todo; `pnpm --filter @rahrow/mobile native:verify` currently fails with `xray apple artifact checksum is missing or invalid`.
- `0000102`, `0000218`, and `0000223` — installed-artifact leak/lifecycle/native-action evidence remains blocked or todo.
- `0000270` and `0000272` — licensing and artifact-specific acknowledgments remain urgent release blockers.

The root README correctly marks the project as work in progress, but its broad app list and capability bullets should not be read as installed-platform proof.

## Shortest credible product boundary

### Candidate: Android-only alpha

Advertise only:

- Android;
- VPN/TUN mode;
- one engine initially (prefer the engine that passes the first full device matrix; current architecture permits temporary sing-box-only Android advertising);
- VLESS, VMess, and Trojan cells that pass import → compile → connect → traffic tests;
- URL and subscription import;
- durable selection/settings;
- connect, disconnect, status, and TCP latency;
- only native QR/share actions that pass on the installed artifact.

Do not advertise Xray on Android until its file-descriptor adapter and packaged runtime pass. Do not advertise desktop VPN, iOS, Windows, Linux, Hysteria2, TV, provider-management links, raw JSON passthrough, LAN sharing, or speed testing merely because related code or roadmap tasks exist.

### Decisive acceptance run

On a supported physical Android device, install the actual APK and prove:

1. clean install and first-launch VPN permission;
2. import a known-good VLESS/VMess/Trojan link and a subscription;
3. connect through the advertised engine and confirm external IPv4/IPv6 and DNS behavior;
4. disconnect and confirm route, DNS, descriptor, process, and notification cleanup;
5. repeat connect/disconnect and switch profiles;
6. test permission denial/revocation, malformed config, background/resume, force-stop, and process death;
7. verify no crash, false Connected state, tunnel recursion, or traffic leak;
8. confirm the APK contains all advertised native libraries, geo assets, licenses, and notices and performs no executable download.

If this matrix passes, RahRow has a working Android alpha even while other platforms remain unavailable. Until it passes, the accurate label is **feature-complete application code with unproven native product integration**.

## Priority interpretation of competitor features

### Required before first product claim

- one installed and verified OS VPN path;
- import/subscription → selection → connect → traffic → disconnect loop;
- truthful capability/error states;
- bundled engine and native components;
- crash/revoke/restart cleanup;
- privacy policy, terms, support contact, system requirements, and honest supported-feature matrix;
- resolved redistribution license and complete bundled-component notices.

### Valuable soon after

- QR/deep-link acquisition and sharing;
- subscription refresh and usage metadata;
- routing/DNS controls backed by real native behavior;
- proxy-aware latency testing;
- LAN sharing only with safe binding/firewall controls.

### Not minimum-product work

- encrypted/limited/HWID/provider-management links;
- TV transfer API and TV apps;
- Hysteria2, Ping Tunnel, DNSTT, SSH, raw Xray JSON;
- per-app routing, on-demand policies, speed testing, and provider stories;
- multi-platform parity before one platform is proven.

## Validation performed

- `pnpm taskset doctor` — passed; 276 tasks.
- `pnpm test` — passed: 170 files passed, 1 skipped; 1,096 tests passed, 8 skipped.
- `pnpm --filter @rahrow/mobile native:verify` — failed because the Xray Apple artifact checksum is missing or invalid.
- Codebase graph inspection covered core import/storage, engine runtime resolution, desktop/mobile connection orchestration, Android `VpnService`/native providers, iOS manager/packet tunnel, and desktop VPN capability gating.
- No implementation code or task status was changed as part of this research.

## Primary references

- [Happ product overview](https://www.happ.su/main)
- [Happ configuration and subscription import](https://www.happ.su/main/faq/adding-configuration-subscription)
- [Happ sharing](https://www.happ.su/main/faq/share-configuration)
- [Happ ping behavior](https://www.happ.su/main/faq/ping)
- [Happ routing documentation](https://www.happ.su/main/dev-docs/routing)
- [Happ privacy policy](https://www.happ.su/main/privacy-policy)
- [Happ terms](https://www.happ.su/main/terms-of-services)
- [Happ desktop releases](https://github.com/Happ-proxy/happ-desktop/releases)
- [v2rayNG](https://github.com/2dust/v2rayNG)
- [HexaSoftwareDev repositories](https://github.com/HexaSoftwareDev?tab=repositories)
- RahRow `README.md`
- RahRow `apps/desktop/README.md`
- RahRow `apps/mobile/README.md`
- RahRow `.agents/skills/rahrow-implement/references/architecture.md`
- RahRow `.agents/skills/rahrow-implement/references/testing-and-done.md`
