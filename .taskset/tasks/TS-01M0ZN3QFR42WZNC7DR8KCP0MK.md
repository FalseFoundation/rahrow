---
id: TS-01M0ZN3QFR42WZNC7DR8KCP0MK
title: Define the scaffold visual contract in @rahrow/ui
status: done
priority: high
risk: medium
createdAt: 2026-08-26 18:25 UTC
updatedAt: 2026-08-26 19:03 UTC
labels:
  - ui-refresh
  - scaffold-fidelity
  - shadcn
parent: TS-01M0ZN2HRE96PN6HY45XKQYM7N
directories:
  - apps/demo
  - packages/ui
projects:
  - rahrow-uiux
---

Audit each scaffold visual state against installed @rahrow/ui primitives before changing features. Keep the base-luma/Base UI/Hugeicons configuration. Add only semantic design tokens or reusable component variants that are genuinely missing: tunnel-ready/connected/warning/success surfaces, compact icon actions, connection-state control treatment, selected Item treatment, app surface/glass treatment, and safe-area-aware sizing where primitive-owned. Do not copy raw demo colors, CSS selectors, Lucide icons, or the demo base-nova preset. Prefer existing Button, Card, Item, Marker, Badge, Progress, Alert, Empty, Drawer, Field, InputGroup, ToggleGroup, Switch, Skeleton, Spinner, ScrollArea, AlertDialog, Tooltip, and sonner APIs. Acceptance: a checked scaffold-to-primitive matrix exists in the task notes or implementation PR; feature code needs no color/typography override classes; light/dark/connected state tokens are semantic; @rahrow/ui typecheck and tests pass.
