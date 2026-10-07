---
id: dab831
title: Build the shared routing policy and geo asset experience
status: todo
priority: high
owner: junkieshuffle
risk: high
createdAt: 2026-10-07 08:31 UTC
updatedAt: 2026-10-07 08:31 UTC
labels:
  - routing
  - settings
  - uiux
dependsOn:
  - ec4859
parent: 8c9114
directories:
  - packages/features/src/settings
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-uiux
  - rahrow-interfaces
  - rahrow-phase-05-integration-and-hardening
---

## Outcome

Replace the current three-value routing chooser with a shared desktop/mobile policy editor backed by the portable routing contract.

## Scope

- Keep shared screen, hooks, models, validation messages, and CSS Modules in packages/features.
- Support ordered rules with add, edit, duplicate, enable/disable, confirmed remove, explicit reorder Save/Cancel, and accessible full-value details.
- Present only matchers, actions, presets, and Geo asset controls supported by the active platform and selected engine.
- Show installed asset version and verification state plus safe update, cancellation, rollback, and actionable error states.
- Provide rule conflict/shadowing feedback and an adapter-produced compile summary without exposing raw engine JSON.
- Treat Apple-specific routing and experimental fragmentation as capability-gated additions, not universal settings.

## Acceptance criteria

- Desktop and mobile render the same in-app routing experience.
- Unsupported controls are absent and reconnect-required changes are staged and applied atomically.
- Keyboard, touch, screen-reader, RTL, loading, empty, validation, and failure states are tested.
- Large rule collections remain responsive without premature virtualization.
- Shared feature tests and both application consumer tests pass.

## Changeset

- Expected packages: @rahrow/features (minor), @rahrow/desktop (minor), and @rahrow/mobile (minor).
- Release-note intent: users can inspect and edit portable ordered routing policies and verified geo assets.
- Desktop and mobile belong to the fixed application release group.
