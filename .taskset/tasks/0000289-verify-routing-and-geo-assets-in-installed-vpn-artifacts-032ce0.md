---
id: 032ce0
title: Verify routing and geo assets in installed VPN artifacts
status: todo
priority: high
owner: junkieshuffle
risk: high
createdAt: 2026-10-07 08:31 UTC
updatedAt: 2026-10-07 08:31 UTC
labels:
  - routing
  - validation
  - installed-artifacts
dependsOn:
  - ec4859
  - dab831
related:
  - cceb79
  - ba3f64
parent: 8c9114
directories:
  - tests
  - engines
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-testing
  - rahrow-release
  - rahrow-phase-06-verification-and-release-gates
---

## Outcome

Prove portable routing and bundled geo assets work in installed artifacts without leaks, stale state, or engine-specific drift.

## Scope

- Verify bundle contents, checksums, notices, offline startup, and optional data-only update rollback.
- Exercise global, direct, private-network bypass, geographic/domain rules, DNS interactions, IPv4/IPv6, UDP, LAN inclusion/exclusion, reconnect, sleep/wake, process death, and engine switching.
- Confirm route, DNS, descriptor, process, and asset cleanup after disconnect, crash, failed update, upgrade, and uninstall where applicable.
- Run on each platform only after its registered VPN provider is available; record unavailable cells truthfully rather than simulating them.
- Compare Xray and sing-box outcomes for policies both engines claim to support.

## Acceptance criteria

- Automated config and bundle verification passes.
- Physical-device or installed-desktop evidence exists for every advertised platform/engine cell.
- Unsupported cells remain hidden/fail closed.
- No route or DNS leak, traffic loop, stale rule asset, or false Connected state remains.
- Release-gate documentation points to reproducible evidence.

## Changeset

Not required for verification-only work unless execution reveals a product-code or packaging change; update this section if scope expands.
