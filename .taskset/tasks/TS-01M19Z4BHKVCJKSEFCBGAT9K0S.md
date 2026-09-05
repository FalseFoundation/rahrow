---
id: TS-01M19Z4BHKVCJKSEFCBGAT9K0S
title: Build schema-driven canonical profile editor and raw engine document workspace
status: done
priority: high
risk: high
createdAt: 2026-08-30 18:32 UTC
updatedAt: 2026-09-02 17:11 UTC
labels:
  - profile-editor
  - protocols
  - research-backed
parent: TS-01M19V6VYXDRMGVQ8XZKAXPR49
directories:
  - packages/core
  - packages/features
  - packages/engine
projects:
  - rahrow
  - rahrow-phase-03-product-state-and-data
---

## Purpose

Finish RahRow's schema-driven connection editor and a separate loss-aware raw engine document workflow. This task must remain usable without the V2Box screenshots.

## Reference UI inventory

The reference connection editor showed:

- A top bar with Back, centered Server title, and Save.
- Common section: Protocol, Remarks, Address, Port, and a protocol-dependent ID / Password / Key field.
- Protocol menu entries: VMess, JSON, Shadowsocks, SOCKS, VLESS, Trojan, WireGuard, SSH, Hysteria 2, HTTP, Ping, Chain, and DNSTT.
- Transport section: Network, Host, Path, and FinalMask raw JSON.
- TLS / Reality section: stream security none/tls/reality, SNI, fingerprint, ALPN choices h3/h2/http1.1, allow-insecure, ECH config list, verify-peer-certificate name, and SHA-256 certificate fingerprint.
- Experimental section: fragmentation and SNI spoofing.
- Destructive Delete action at the bottom.

The reference subscription editor showed Name, source URL, Lock Subscription, and Save Changes.

## Product decisions

- Render only protocols supported end-to-end by RahRow's capability matrix. Do not copy menu entries merely because another client displays them. Support requires a canonical schema, parser/serializer, editor, engine compiler, tests, and active-engine compatibility.
- Keep protocol read-only until a loss-aware protocol conversion API exists. A dropdown that silently discards credentials, transport, or security fields is forbidden.
- The editable and persisted truth is the versioned canonical ConnectionProfile.
- Share URLs may round-trip semantically through the canonical model; byte-for-byte URL equality is not required.
- Engine output is generated one-way. A complete Xray or sing-box document is not a single profile.
- Keep allow-insecure per profile. Never add it as a global default.
- ECH, certificate pinning, fragmentation, SNI spoofing, FinalMask, and other advanced fields appear only when the canonical schema, selected engine, and selected platform all support them.
- Deletion remains a confirmed collection action rather than being hidden inside every form if that produces a more consistent RahRow interaction.

## Remaining deliverables

1. Derive form sections from protocol/capability descriptors rather than scattered protocol string checks.
2. Complete semantic URI round-trip coverage for every supported protocol and preserve safe unknown URI parameters in a namespaced extension bag.
3. Add a ConversionResult contract with fidelity lossless/normalized/lossy, warnings, and unrepresented field paths.
4. Add raw Xray and sing-box document surfaces separate from the profile editor:
   - preserve the original raw document;
   - validate through the matching pinned engine adapter;
   - extract exactly one supported outbound only by explicit user action;
   - report every ignored DNS, routing, inbound, policy, stats, observatory, additional outbound, and engine-only field;
   - require confirmation before lossy export or replacement;
   - stage and validate before atomic persistence.
5. Add canonical JSON diff preview before applying edits.
6. Add protocol-specific validation and capability explanations adjacent to unavailable combinations.
7. Keep subscription ownership metadata, stable profile identity, tags, and source metadata through every edit.

## Acceptance criteria

- Fields cover common endpoint/authentication plus modeled transport and TLS/Reality settings for each supported protocol.
- Invalid protocol/transport/security combinations cannot be saved.
- Protocol and identity coercion through canonical JSON is rejected.
- URI -> canonical -> URI -> canonical yields semantically equal profiles for fixtures of every supported scheme.
- Raw engine extraction fixtures enumerate all lost/unrepresented paths.
- Full engine JSON is never labeled as canonical profile JSON or promised as lossless.
- Secrets are masked where appropriate and never logged.
- Keyboard, focus, validation, screen-reader, desktop, and mobile drawer behavior are tested.
- Unit tests cover transformations; integration tests cover persistence and both engine compilers.

## Existing implementation

The canonical field/JSON editor is delivered in child task TS-01M1A0159ZCPTYCA0MQG1WW9XT. The raw-document and loss-report work remains open. Use docs/research/profile-editing-and-tanstack-adoption.md as the design record.


Screenshot-verification clarifications

- Produce a checked-in protocol × transport × security × engine × platform form matrix. Each cell declares supported, unsupported, or extension-only; required/optional fields; defaults; validation; import/export fidelity; engine mapping; and test fixtures.
- Subscription editor validates a non-empty name and supported HTTPS/HTTP source URL, displays secret-bearing query values safely, prevents tokens from entering logs/toasts, shows save progress and field/server errors, and confirms before closing, swiping, or navigating away with unsaved changes.
- Reuse the program-wide Lock Subscription contract: source fields are protected from accidental edits, refresh remains explicit and permitted, and lock never changes selection/export/deletion semantics.
- Drawer behavior includes an accessible title/description, keyboard and gesture-safe drag handle, explicit close action, focus trap, focus restoration to the opener, unsaved-change interception, and separately confirmed destructive actions.
- The reference background QR, Add, and list/order icons are ambiguous. Map only to existing named RahRow import/add/list commands with labels/tooltips; otherwise omit them. Never copy unexplained icon-only actions.
