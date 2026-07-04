---
title: Runtime Files
description: Runtime and profile file direction for the RahRow platform.
---

# Runtime Files

Runtime and profile artifacts define the product direction.

## Current State

The monorepo currently contains scaffold-level runtime directories:

- `runtimes/http/`
- `runtimes/hysteria/`
- `runtimes/mock/`
- `runtimes/sing-box/`
- `runtimes/socks/`
- `runtimes/wireguard/`
- `runtimes/xray/`

Apps and packages are expected to consume shared contracts from the workspace
instead of duplicating runtime semantics per surface.

## File Direction

RahRow runtime files will center around:

- protocol and outbound/inbound profile definitions
- secure credential and key material handling
- platform capability overlays
- deterministic import/export and validation behavior
- migration-safe schema evolution

This page will be expanded as runtime/profile schemas and platform contracts
reach implementation maturity.
