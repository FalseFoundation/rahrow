---
id: 0000085-rebuild-profiles-and-subscriptions-as-the-connections-experience
title: Rebuild Profiles and Subscriptions as the Connections experience
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
  - packages/features/src/profiles
  - packages/features/src/subscriptions
  - packages/features/src/app
  - packages/ui
projects:
  - rahrow-uiux
---

Create the scaffold Connections presentation while preserving the existing profile and subscription owners. Compose subscription/local groups, compact search, sort/filter state, profile selection, availability, pinning, latency, usage, expiry, refresh status, and group/profile action triggers. Use InputGroup for search, Item groups for rows, Progress for subscription usage, Badge/Marker for metadata, Alert for warnings, Empty for empty groups, Button/DropdownMenu for actions, and Hugeicons. Keep hooks/models separate and use TanStack Pacer/Virtual only where data size warrants it. Acceptance: Profiles and Subscriptions logic is not merged into one workflow owner; selected/unavailable/error states use shared variants/tokens; no raw interactive divs or styled spans.
