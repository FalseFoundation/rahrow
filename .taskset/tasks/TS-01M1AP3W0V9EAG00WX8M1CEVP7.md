---
id: TS-01M1AP3W0V9EAG00WX8M1CEVP7
title: Keep the connected app neutral except for the blue power control
status: done
priority: high
risk: medium
createdAt: 2026-08-31 01:14 UTC
updatedAt: 2026-09-02 16:49 UTC
labels:
  - theme
  - connection-state
  - ui
  - design-tokens
related:
  - TS-01M17F40S69ETQRYDTDPQ7ZMVT
  - TS-01M1A8DW05SXPM1X974A6V65ET
  - TS-01M1AM68XJ5G8CNBTBZ84C12EM
files:
  - packages/ui/src/global.css
  - packages/ui/src/global-color-contract.test.ts
  - packages/features/src/home/Home.tsx
  - packages/features/src/home/Home.module.css
  - packages/features/src/app/AppShell.tsx
directories:
  - packages/ui/src
  - packages/features/src/home
  - packages/features/src/app
projects:
  - rahrow-uiux
  - rahrow-phase-02-light-ui-and-copy
---

## Purpose

Supersede the global connected-state recoloring behavior. The application must retain the neutral Shadcn palette in every connection state; only the Home power button and its intentional local halo become blue while connected.

## Implementation contract

- Remove the connected document-state remapping of primary, ring, sidebar-primary, focus, badge, navigation, and generic success tokens.
- Keep data-connection-state only if it remains useful for semantics, automation, or the local power-control selector; it must no longer recolor unrelated primitives.
- Define a narrow power-control connected variant or local semantic token in the shared UI/Home boundary. Do not hard-code blue across multiple components.
- Disconnected, connecting, disconnecting, and error states remain neutral unless an existing destructive/error treatment is semantically required.
- Connected badges, navigation, switches, links, focus rings, selected rows, and generic primary buttons stay neutral.
- Preserve adequate contrast in light and dark themes and do not use color as the only indication of connection status.
- Remove obsolete global connection-color declarations and update tests that encoded the previous whole-app palette.

## Acceptance criteria

- Visual and computed-style tests show identical neutral global tokens while disconnected and connected.
- The power button alone receives the blue connected foreground/background/halo treatment.
- Keyboard focus remains visible and neutral outside the power control.
- Screenshots cover Home, Connections, Settings, Diagnostics, drawers, and navigation in disconnected and connected states for light and dark themes.
- Desktop and mobile render the same product UI with no host-shell overrides.
- Existing error, destructive, warning, and accessibility semantics continue to pass contrast tests.
