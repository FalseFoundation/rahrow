---
id: 2afaf7
title: Define and test the V2Fly compatibility boundary
status: todo
priority: high
owner: junkieshuffle
risk: high
createdAt: 2026-10-07 12:32 UTC
updatedAt: 2026-10-07 12:32 UTC
labels:
  - engine
  - import
  - subscriptions
related:
  - b876a1
  - ca9630
parent: "667788"
directories:
  - packages/core
  - packages/engine
projects:
  - rahrow-core
  - rahrow-phase-05-integration-and-hardening
---

## Outcome

Define and verify RahRow's compatibility boundary for current V2Fly inputs without bundling v2ray-core as a third runtime.

## Scope

- Inventory official V2Fly JSON v4, draft JSON v5, outbound subscription, and common share-link inputs relevant to RahRow.
- Detect V2Fly-specific raw documents separately from Xray raw JSON.
- Normalize only fully representable supported outbounds into RahRow canonical profiles.
- Produce explicit loss or incompatibility results for unsupported services, transports, routing, and engine-specific fields.
- Never execute or relabel a raw V2Fly document as Xray configuration.
- Add representative fixtures and regression tests for accepted, partially representable, malformed, and rejected inputs.
- Keep subscription fetching, refresh, persistence, and policy in RahRow-owned services.

## Acceptance criteria

- V2Fly JSON v4/v5 and subscription inputs are classified deterministically.
- Supported common outbounds round-trip through canonical profiles with no silent field loss.
- Unsupported raw documents fail closed with actionable engine/format diagnostics.
- Tests use current official V2Fly examples and include provenance/version notes.
- No v2ray-core executable or Go package is added to release artifacts.

## References

- https://github.com/v2fly/v2ray-core
- https://www.v2fly.org/en_US/
- https://www.v2fly.org/en_US/config/overview.html
- https://www.v2fly.org/en_US/v5/config/proxy.html
- https://www.v2fly.org/en_US/v5/config/service/subscription.html

## Changeset

Not required for planning. Reassess during implementation if public package behavior changes.
