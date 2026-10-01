---
id: 0000087-rebuild-settings-diagnostics-and-logs-in-the-scaffold-hierarchy
title: Rebuild Settings, Diagnostics, and Logs in the scaffold hierarchy
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
  - 0000083-rebuild-the-shared-app-shell-and-primary-navigation
parent: 0000081-build-the-shared-rahrow-product-interface-and-design-system
directories:
  - packages/features/src/settings
  - packages/features/src/diagnostics
  - packages/features/src/logs
  - packages/features/src/app
  - packages/ui
projects:
  - rahrow-uiux
---

Present Settings as scaffold-style searchable grouped rows, with nested detail routes or drawers for engine/routing/ports/theme/platform preferences, Diagnostics, Logs, reset, and about/version information. Use InputGroup search, Item, Switch, Select or ToggleGroup, Marker, Badge, Alert, AlertDialog, ScrollArea, and existing log virtualization. Keep useSettings/useDiagnostics/runtime capabilities as owners of behavior and truthful support states. Do not label latency as speedtest or claim unavailable capabilities. Acceptance: searchable groups are keyboard accessible; forms use Field composition and Base UI APIs; Logs remains virtualized; reset is confirmed; all existing product routes remain reachable.
