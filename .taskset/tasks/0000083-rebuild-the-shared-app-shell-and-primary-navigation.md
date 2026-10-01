---
id: 0000083-rebuild-the-shared-app-shell-and-primary-navigation
title: Rebuild the shared app shell and primary navigation
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
  - 0000082-define-the-scaffold-visual-contract-in-rahrow-ui
parent: 0000081-build-the-shared-rahrow-product-interface-and-design-system
directories:
  - packages/features/src/app
  - packages/ui
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-uiux
---

Replace the current developer header and seven-link strip with the scaffold information architecture in packages/features: shared top bar, constrained app canvas, safe-area spacing, and bottom primary navigation for Home, Connections, and Settings. Keep TanStack Router and the real route tree; represent Profiles, Subscriptions, Import, Diagnostics, and Logs as secondary/nested destinations or overlays without removing capabilities. Compose navigation and actions from @rahrow/ui using Hugeicons; feature CSS Modules own only shell layout/responsiveness. Acceptance: desktop and mobile mount exactly the same shell; keyboard/focus/aria-current behavior works; no app-local product styling; existing deep links resolve or redirect intentionally.
