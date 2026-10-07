---
id: 8c9114
title: Implement portable routing policy editor with native capability gates
status: todo
priority: high
owner: junkieshuffle
risk: high
createdAt: 2026-08-30 18:32 UTC
updatedAt: 2026-10-07 08:33 UTC
labels:
  - routing
  - native
  - settings
related:
  - 7a283a
  - 91489e
  - "866e12"
parent: "542944"
directories:
  - packages/core
  - packages/engine
  - packages/features
  - apps/desktop
  - apps/mobile
  - engines
projects:
  - rahrow
  - rahrow-engine
  - rahrow-uiux
  - rahrow-phase-05-integration-and-hardening
---

## Purpose

Implement an engine-neutral ordered routing policy editor and compile it truthfully for Xray and sing-box, with native/platform gates.

## Reference UI inventory

The routing reference showed:

- Geo Assets entry.
- Domain Strategy with AsIs, IPIfNonMatch, and IPOnDemand explanations.
- Route Only toggle described as sniffing that maps the domain for routing without overriding the destination IP.
- Apple on direct toggle for Apple notifications, iCloud, Apple Pay, and related traffic.
- Enable Fragmentation.
- Move to order routes / Edit.
- Add Rule.
- Ordered rules with title, match summary, enabled toggle, detail navigation, and outbound action labels block/proxy/direct.
- Example matches included UDP/443 blocking, geosite:google to proxy, geoip:private and geosite:private to direct, DNS IP lists to direct, and DNS domain lists to direct.

## Domain model

- Versioned RoutingPolicy aggregate containing ordered Rule entities with stable IDs.
- Rule matcher union: domain, domain suffix/keyword/regex where supported, IP/CIDR, port/range, network TCP/UDP, inbound tag, protocol, GeoIP, and GeoSite.
- Rule action union: selected proxy, direct, block, DNS, or named outbound where supported.
- Explicit enabled state, title, optional notes, and order.
- Portable domain strategy values with per-engine compilation and capability errors.
- Geo asset metadata: source, version/hash, update time, signature/checksum state, and compatible engines.
- Sniffing and route-only semantics modeled separately from DNS strategy.

## Product decisions

- Preserve user ordering and provide reorder, enable/disable, duplicate, edit, and confirmed remove actions.
- Provide rule validation and conflict/shadowing warnings before save.
- Compile to Xray and sing-box through separate adapters; never expose raw engine tags as the portable domain model.
- Route Only appears only when the selected engine supports equivalent sniffing semantics.
- Apple on direct is an Apple-only preset/capability, not a global cross-platform row.
- Fragmentation is experimental, off by default, and visible only for validated engine/platform combinations.
- Geo assets require a secure update policy, bounded downloads, checksum/signature verification where upstream supports it, atomic replacement, and rollback.
- Built-in presets must be inspectable; users must be able to see the exact generated rules.
- DNS routing rules must integrate with the DNS policy task rather than duplicating resolver state.

## UX requirements

- Full-width nested settings page using the global subpage header/back pattern; do not place the whole page in a space-wasting card.
- Search/filter large rule sets and virtualize only above a measured threshold.
- Add/edit uses a drawer with matcher type first, then schema-driven fields and action.
- Explanations for domain strategy and route-only behavior must be available without hover.
- Show validation at field and rule level, plus a compile preview for the active engine.
- Hide unsupported matchers/actions rather than saving data the engine will ignore.

## Acceptance criteria

- Deterministic compile snapshots for Xray and sing-box.
- Round-trip persistence keeps stable IDs, order, enabled state, and portable fields.
- Tests cover first-match ordering, rule shadowing, private-network behavior, DNS routing, IPv4/IPv6 CIDRs, UDP/443, GeoIP/GeoSite, and unsupported capability errors.
- Native VPN leak tests validate default route, split routes, LAN routes, Apple presets, reconnect, and engine switching.
- Importing raw engine routing produces a loss report for fields outside the portable model.
- No platform-specific toggle appears on an unsupported platform.


Screenshot-verification clarifications

- Reorder mode has explicit entry, Save, and Cancel. Persist the complete order atomically; Cancel restores the prior order and engine compilation.
- Geo Assets management exposes installed version, source, timestamp, checksum/signature status, update progress, cancellation where safe, rollback to the last valid asset, and actionable errors.
- The reference top-right overflow icon has no visible contracted behavior. Omit it until RahRow has named actions; do not invent an icon-only menu.
- Truncated rule titles/summaries retain the complete value through an accessible name/details view and keyboard/touch access.
- Use the shared full-width nested-page shell with unified header, bottom-left back affordance, safe areas, and no persistent root tabs or connect bar.

## Delivery plan

This parent is delivered through independently tracked child outcomes:

- 08926e — qualify, license, pin, bundle, update, and roll back GeoSite/GeoIP assets.
- ec4859 — define the portable policy and compile it for Xray and sing-box.
- dab831 — build the shared desktop/mobile editor and Geo Assets experience.
- 032ce0 — prove installed-artifact routing, lifecycle cleanup, and leak behavior.

The order is based on concrete inputs: the compiler needs the asset contract, the UI needs the portable/compiler contract, and installed-artifact verification needs both implementation surfaces. DNS work remains related rather than duplicated.

## SagerNet adoption constraints

- Consume sing-geosite and sing-geoip as versioned data inputs, never as RahRow domain types.
- Bundle a verified offline baseline; optional updates are data-only and must be bounded, checksummed, atomic, and recoverable.
- Keep SRS and Xray-specific representations inside engine adapters.
- Complete provenance, license, notice, and artifact inventory work before advertising bundled presets.

## Changeset

- Expected packages: @rahrow/core (minor), @rahrow/engine (minor), @rahrow/features (minor), @rahrow/desktop (minor), @rahrow/mobile (minor), and @rahrow/cli (minor if CLI routing control or behavior changes).
- Release-note intent: RahRow gains portable ordered routing policies backed by verified geographic and domain assets across supported engines.
- Use one coherent changeset unless implementation produces independently shippable asset and editor capabilities; reconcile the fixed application group and internal-dependent bumps before completion.

## References

- https://github.com/SagerNet/sing-geosite
- https://github.com/SagerNet/sing-geoip
- https://github.com/SagerNet/sing-box/blob/testing/docs/manual/proxy/client.md
- docs/research/engine-licensing-store-distribution.md
