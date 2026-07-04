---
title: "ADR 0002: Client and Server Code Architecture"
description: Use FBA for interfaces and a DDD-lite modular monolith for core and server code.
---

# ADR 0002: Client and Server Code Architecture

- Status: Accepted
- Date: 2026-06-12

## Context

Feature-based architecture fits user-facing surfaces, but applying it alone to
domain-heavy storage and workflow code can mix business rules with adapters.
Full enterprise DDD would add unnecessary ceremony to an early product.

## Decision

- Use FBA for CLI, TUI, MCP, extension, Kanban, Office, and website surfaces.
- Use a DDD-lite modular monolith for `@rahrow/core` and any future server.
- Organize core by domain module first.
- Within a module, use `domain`, `application`, and `infrastructure` only when
  those boundaries contain meaningful code.
- Keep one deployable unit and direct in-process module calls.

## Consequences

- Domain rules remain reusable across every interface.
- Filesystem and Git details stay replaceable and testable.
- Teams avoid premature services, queues, and distributed state.
- Small modules are allowed to stay flat until complexity justifies layers.
