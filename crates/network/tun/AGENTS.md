# Agent Guidance

## Purpose
Protect architecture boundaries for crates/tun.

## Responsibilities
- Keep this crate focused on tun responsibilities.
- Maintain explicit crate interfaces.
- Preserve runtime safety and portability goals.

## What Not To Do
- Do not add UI/application concerns in this crate.
- Do not bypass runtime manager contracts.
- Do not couple to unrelated crate internals.

## Allowed Dependencies
- Rust std and crate dependencies appropriate for this boundary.
- Explicit internal crate dependencies.

## Forbidden Dependencies
- UI or app-layer code.
- Hidden side-channel integrations.

## Architectural Boundaries
Runtime crates remain below package/app layers and expose explicit contracts.
