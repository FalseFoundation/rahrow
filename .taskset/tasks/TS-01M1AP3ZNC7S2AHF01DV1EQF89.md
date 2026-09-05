---
id: TS-01M1AP3ZNC7S2AHF01DV1EQF89
title: Restore a distinct neutral selected state in Connections
status: done
priority: high
risk: medium
createdAt: 2026-08-31 01:14 UTC
updatedAt: 2026-09-02 16:49 UTC
labels:
  - connections
  - selection
  - accessibility
  - ui
dependsOn:
  - TS-01M1AP3W0V9EAG00WX8M1CEVP7
related:
  - TS-01M19V6CEEDGEBSWP4CMPHACBH
parent: TS-01M1AM68XJ5G8CNBTBZ84C12EM
files:
  - packages/features/src/profiles/ProfileManagement.tsx
  - packages/features/src/profiles/Profiles.module.css
  - packages/features/src/profiles/profile-management-model.test.ts
  - packages/ui/src/components/ui/item.tsx
directories:
  - packages/features/src/profiles
  - packages/ui/src/components/ui
projects:
  - rahrow-uiux
  - rahrow-phase-02-light-ui-and-copy
---

## Purpose

Make the selected connection immediately distinguishable from sibling rows after the neutral palette change, without reintroducing app-wide connection coloring.

## Visual and semantic contract

- Style the existing data-selected state with a neutral combination of surface contrast, border or inset indicator, type weight, and optional check marker.
- Do not rely on blue, color alone, hover state, or focus state to communicate selection.
- Selected, hovered, pressed, keyboard-focused, and disabled states must remain distinguishable from one another in light and dark themes.
- Preserve compact row density, virtualization measurements, touch targets, action-button hit areas, and text truncation behavior.
- Expose programmatic selection with aria-current or aria-selected on the correct interactive/list primitive, based on the final widget semantics.
- Keep the row action menu independent: opening actions must not accidentally activate or change the selected connection.
- Use shared Item/Button variants only if the pattern is reusable; keep Connections composition in its CSS Module.

## Acceptance criteria

- With at least three rows, the selected row is identifiable in grayscale and by assistive technology.
- The neutral selected treatment remains visible while the row or nested action button has focus and while another row is hovered.
- Tests cover selection changes, initial persisted selection, action-menu clicks, keyboard activation, virtualized and non-virtualized lists, and subscription-owned rows.
- Visual checks cover narrow mobile, desktop, light/dark, high contrast, reduced motion, and 200 percent zoom.
- No global primary or connected-state token is changed by this task.
