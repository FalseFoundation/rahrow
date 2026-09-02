---
id: TS-01M0ZN3QXKDAH5SKXWYS29RKWP
title: Rebuild Home as the scaffold connection experience
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
  - TS-01M0ZN3QQ07972A767SFGRG3NA
parent: TS-01M0ZN2HRE96PN6HY45XKQYM7N
directories:
  - packages/features/src/home
  - packages/ui
projects:
  - rahrow-uiux
---

Recompose the existing useHome state/actions into the scaffold connection-first Home: readiness marker, central connect/disconnect control, state-aware status copy, protocol/engine/latency telemetry, active-profile selector, and local-to-public route summary. Use Card composition, Button variants, Item, Marker, Badge, Separator, Tooltip, Spinner, and semantic tokens/variants from @rahrow/ui. Keep connection transitions, profile selection, latency testing, error states, reduced motion, and empty/loading states real and hook-owned. Acceptance: no copied demo timers or fake IP/state; presentational files do not own workflows; disconnected/connecting/connected/error states are accessible and tested.
