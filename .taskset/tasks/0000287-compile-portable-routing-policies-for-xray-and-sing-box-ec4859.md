---
id: ec4859
title: Compile portable routing policies for Xray and sing-box
status: todo
priority: high
owner: junkieshuffle
risk: high
createdAt: 2026-10-07 08:31 UTC
updatedAt: 2026-10-07 08:31 UTC
labels:
  - routing
  - engine
  - testing
dependsOn:
  - 08926e
related:
  - 8edc53
parent: 8c9114
directories:
  - packages/core
  - packages/engine
projects:
  - rahrow-core
  - rahrow-engine
  - rahrow-phase-05-integration-and-hardening
---

## Outcome

Make the persisted Routing setting control a versioned, engine-neutral policy that compiles deterministically for Xray and sing-box.

## Scope

- Define a minimal ordered RoutingPolicy aggregate and stable rule IDs in @rahrow/core.
- Preserve global, direct, and rule modes while migrating existing settings safely.
- Model only portable matchers and actions needed by current product presets; engine-only fields remain adapter details.
- Compile policy, DNS interactions, sniffing semantics, GeoSite/GeoIP references, and direct/proxy/block actions separately in the Xray and sing-box adapters.
- Pass the policy through EngineStartInput with atomic reconnect and rollback behavior.
- Report capability errors before connection when an engine or platform cannot represent a rule.
- Add deterministic snapshots, malformed-policy tests, migration tests, and Xray/sing-box parity coverage.

## Acceptance criteria

- The current routing setting is no longer UI-only: each mode changes generated engine configuration.
- First-match order, disabled rules, IPv4/IPv6 CIDRs, private-network bypass, UDP/443 blocking, and engine switching are covered.
- No raw sing-box SRS tag or Xray routing JSON leaks into the portable domain.
- Existing profiles and stored settings migrate without silently changing effective routing.
- Focused package tests and affected consumer tests pass.

## Changeset

- Expected packages: @rahrow/core (minor) and @rahrow/engine (minor).
- Release-note intent: portable routing policies now compile consistently for Xray and sing-box.
- Reconcile internal-dependent bumps through the repository Changesets configuration.
