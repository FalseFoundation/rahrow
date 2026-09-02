---
id: TS-01M1A43HK5X3ZZ3F2PS8Z8V5ZG
title: Design and implement engine-neutral DNS policy and leak-safe resolver settings
status: todo
priority: high
risk: high
createdAt: 2026-08-30 19:59 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - dns
  - engines
  - privacy
  - native
  - screenshot-spec
parent: TS-01M19V6VYXDRMGVQ8XZKAXPR49
directories:
  - apps
  - packages
projects:
  - rahrow
  - rahrow-phase-01-idea-and-research
---

Purpose

Implement DNS Settings as a first-class, engine-neutral policy that compiles truthfully to Xray and sing-box and cooperates with routing and TUN mode. The Settings screenshot only exposes a DNS Settings entry; the supplied Xray JSON demonstrates the underlying fields. This task records the complete intended behavior so no screenshot or sample JSON is needed later.

Reference data to account for

The supplied Xray configuration contains:
- disableCache, disableFallback, and disableFallbackIfMatch.
- hosts overrides mapping hostnames or domain rules to one or more IPv4/IPv6 addresses, plus alias mapping such as domain:googleapis.cn to googleapis.com.
- queryStrategy set to UseIP.
- servers containing 1.1.1.1.
- a DNS tag.
- routing rules that direct DNS resolver IPs/domains through direct or proxy outbounds.

Canonical domain model

Create a versioned DNSPolicy separate from engine-native JSON:
- mode: system, automatic, or custom.
- ordered resolvers with stable IDs, display name, protocol, endpoint, port/path, bootstrap addresses, TLS server name, route/direct/proxy policy, enabled state, and engine capability metadata.
- supported transport vocabulary: UDP/TCP, DoT, and DoH where adapters/platforms genuinely support them; future types must be capability-gated.
- query strategy: automatic, IPv4 only, IPv6 only, prefer IPv4, or prefer IPv6, mapped with documented engine-specific fallbacks.
- cache policy and bounded cache behavior.
- fallback resolver policy, fallback-if-match semantics, and explicit matching rules.
- hosts overrides supporting exact domains, suffix/domain rules where portable, aliases, and multiple IP addresses.
- leak-protection intent, bootstrap policy, and whether DNS follows selected routing or a specified outbound.
- optional engine extensions preserved in namespaced extension storage and surfaced only in an advanced raw editor.

UX behavior

- Default to Automatic, selecting a privacy-safe resolver strategy compatible with the current tunnel/platform. Never silently replace OS DNS while disconnected unless the user selected that behavior.
- Resolver rows are add/edit/remove/reorder/enable actions with protocol-specific forms and inline validation.
- Provide presets only as editable templates with clear provider names; do not imply endorsement.
- Hide fields unsupported by the active engine/platform. If switching engines would lose semantics, show the exact affected fields before applying.
- Explain query strategy, bootstrap, cache, fallback, and routing in plain language.
- Show applying/testing progress without flashing stale content. Preserve the last confirmed settings until an atomic apply succeeds.
- A resolver test reports DNS resolution latency and failure details; it is not labeled a connection speed test and must be cancellable.

Compilation and runtime requirements

- Implement deterministic Xray and sing-box adapters with capability/loss reports.
- Detect bootstrap loops, resolver self-dependency, malformed IP/domain/URL/port values, conflicting host rules, empty custom resolver sets, and incompatible transport/security combinations.
- Integrate DNS routing with the ordered routing-policy model rather than generating hidden contradictory rules.
- In TUN mode, apply native DNS capture/restore where required; restore prior OS state on disconnect, crash recovery, reset, or failed startup.
- Prevent DNS leakage according to the chosen policy and expose verifiable diagnostic state: requested policy, effective compiled policy, native DNS state, and redacted recent resolver errors.
- Treat resolver endpoints and host rules as potentially sensitive in logs/exports.

Explicit exclusions

- Do not expose raw Xray-only toggles as universal settings.
- Do not promise identical fallback/query behavior across engines; represent adapter degradation explicitly.
- Do not add FakeIP, ECS, DNS ad blocking, or remote rule-set downloads until a separate capability/security design is approved.
- Do not hard-code the sample provider addresses or tags as defaults.

Acceptance criteria

- A DNSPolicy round-trips through persistence without losing canonical fields or unknown namespaced extensions.
- Golden tests cover Xray and sing-box compilation for system/automatic/custom modes, transports, query strategies, fallback, hosts aliases, and route selection.
- Unsupported combinations are blocked before runtime with actionable messages.
- Native integration tests prove DNS application and restoration on connect, disconnect, engine failure, app crash recovery, reset, network change, and TUN/proxy mode transitions.
- Leak tests cover IPv4/IPv6, split routing, local-network inclusion, captive/no-network conditions, and resolver bootstrap.
- UI tests cover empty/custom lists, validation, reordering, engine switching, loading/error states, keyboard/touch accessibility, and secret-safe copy/export.
- Diagnostics show requested versus effective DNS state without leaking subscription tokens, credentials, or complete browsing queries.
