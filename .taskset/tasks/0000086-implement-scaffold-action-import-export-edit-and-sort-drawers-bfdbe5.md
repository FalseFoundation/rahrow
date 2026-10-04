---
id: bfdbe5
title: Implement scaffold action, import, export, edit, and sort drawers
status: done
priority: high
risk: medium
createdAt: 2026-08-26 18:25 UTC
updatedAt: 2026-08-26 19:03 UTC
labels:
  - ui-refresh
  - scaffold-fidelity
  - shadcn
dependsOn:
  - "707565"
parent: e1b2fd
directories:
  - packages/features/src/import
  - packages/features/src/profiles
  - packages/features/src/subscriptions
  - packages/features/src/share
  - packages/ui
projects:
  - rahrow-uiux
---

Replace the demo hand-built modal markup with @rahrow/ui Drawer compositions for mobile/desktop-consistent secondary workflows: sort, import from URL/clipboard/QR/subscription/manual input, profile/group actions, export/copy/share/QR, profile edit, and settings subviews. Use required DrawerTitle/Description, FieldGroup/Field, InputGroupInput or InputGroupTextarea, ToggleGroup for sort choices, Item for action rows, AlertDialog for destructive confirmation, Spinner for pending actions, and sonner for notifications. Preserve injected platform capabilities and protocol pipelines; never call navigator or parse protocol data from presentational components. Acceptance: focus management, escape/backdrop close, disabled/pending/error states, validation aria attributes, and capability-unavailable fallbacks are covered.
