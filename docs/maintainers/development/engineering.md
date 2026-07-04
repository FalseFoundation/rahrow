---
title: Engineering
description: Design principles and pragmatic package and tooling decisions for RahRow.
---

# Engineering

RahRow favors minimal designs with explicit ownership and testable boundaries.
Apply SOLID, separation of concerns, encapsulation, high cohesion, low coupling,
clean architecture, pragmatic DDD, and feature-based architecture as decision
tools rather than reasons to add layers.

## Objects And Functions

Use classes when they improve a stateful domain model, lifecycle, polymorphic
adapter, or dependency-injected boundary. Keep stateless parsers, serializers,
validators, and transformations as focused functions. Converting
`frontmatter`, repository operations, or the current CLI to classes without a
state or substitution need would add ceremony rather than clarity.

Use in-process domain events when several independent reactions need
decoupling. Do not introduce brokers or distributed event infrastructure
without a concrete product requirement.

## Package Boundaries

`@rahrow/contracts` is a useful boundary because clients and core share runtime
schemas and TypeScript contracts without depending on filesystem behavior. The
name is more accurate than `@rahrow/types` because the package emits runtime
Zod schemas.

Do not add `@rahrow/validations`. Static schemas belong in contracts; domain
validation policy and migrations belong in core. A second package would split
one responsibility and make imports harder to understand.

Node libraries and the CLI build to `dist/`. Their runtime `import` exports
point to JavaScript artifacts so builds and future packaging are actually
verified. Source exports remain available for types and development tooling.

## Tool Ownership

- Keep Next.js and React compiler dependencies in `apps/www`, the only current
  Next.js owner.
- Keep reusable TypeScript presets in `@rahrow/tooling`; move framework runtime
  configuration there only after multiple consumers need it.
- Use TypeScript directly for Node packages and the CLI. Vitest already uses
  Vite; add a Vite build only for a browser package or a demonstrated bundling
  requirement.
- Keep one repository standards skill while usage and maintenance rules share
  product contracts. Keep its references split by topic so agents can load only
  the relevant guidance. Split a separate user skill only when it has a distinct
  audience, installation path, and lifecycle.

## Task Semantics

Priority is RahRow's importance signal, and `urgent` is its highest value.
`order` is the optional user-controlled sequence signal. A separate urgency
scale is intentionally omitted because overlapping importance scales increase
ambiguity and synchronization work.
