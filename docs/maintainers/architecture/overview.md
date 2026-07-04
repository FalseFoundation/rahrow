---
title: Architecture Overview
description: Maintainer-facing package boundaries, runtime flow, and code organization.
---

# Architecture Overview

RahRow is a modular, cross-platform V2Ray client platform monorepo.

```text
apps/* clients  ->  packages/* domain contracts  ->  runtimes/* protocol adapters
                      |                                      |
                      +---------- shared telemetry/diagnostics+
                      |
                   crates/* systems modules
```

## Package Direction

```text
apps (dashboard/desktop/mobile/server/web/www)
       |
packages (routing/protocol/storage/diagnostics/...)
       |
runtimes (xray/sing-box/wireguard/socks/http/...)
       |
crates (network/system/native support)
```

- `apps/*` own platform-specific UX and orchestration entry points.
- `packages/*` own shared business logic, contracts, diagnostics, and tooling.
- `runtimes/*` own protocol/runtime adapters and integration boundaries.
- `crates/*` own Rust-native networking and system-level capabilities.
- Packages should depend inward on stable contracts and utilities.

## Client Organization

UI and interaction surfaces use feature-based architecture. Each feature
colocates components, state, adapters, fixtures, and tests. Promote shared code
only when several features depend on the same stable abstraction.

## Core and Server Organization

TypeScript services and Rust modules should maintain clear ownership boundaries:

```text
domain/
application/
infrastructure/
interfaces/
```

This layering is pragmatic, not ceremonial:

- organize by domain module first
- keep pure invariants in `domain`
- coordinate use cases in `application`
- isolate protocol engines, IO, and framework concerns in `infrastructure`
- omit layers that have no meaningful behavior
- keep one process and deployable unit

`apps/server` should remain a composition root for API and orchestration
workloads, not a place to duplicate client or runtime domain logic.

Relational backends may be used for service concerns, but should not replace
explicit, versioned domain contracts.

## Runtime Direction

Near-term architecture effort focuses on:

- profile and provider models
- runtime lifecycle and health orchestration
- transport/protocol adapter contracts
- platform capability abstraction and diagnostics
- observability and reliability boundaries

## Documentation

The root `docs/` tree contains canonical user guidance and maintainer guidance.
User pages stay at the top level. Maintainer material lives under
`docs/maintainers/`. `apps/www` renders usage docs and maintainer docs from the
same content symlink but exposes them through separate route layouts and
navigation. See the
[documentation platform decision](decisions/0001-documentation-platform.md).

## Decisions

- [Documentation platform](decisions/0001-documentation-platform.md)
- [Client FBA and modular core/server](decisions/0002-code-architecture.md)
- [Snapshot policy](decisions/0003-snapshot-policy.md)
- [Synchronization](synchronization.md)
