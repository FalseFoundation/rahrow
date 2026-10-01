---
id: 0000088-verify-rahrow-interface-accessibility-and-shared-app-parity
title: Verify RahRow interface accessibility and shared-app parity
status: doing
priority: high
risk: medium
createdAt: 2026-08-26 18:25 UTC
updatedAt: 2026-09-02 16:47 UTC
labels:
  - ui-refresh
  - shadcn
  - accessibility
dependsOn:
  - 0000082-define-the-scaffold-visual-contract-in-rahrow-ui
  - 0000083-rebuild-the-shared-app-shell-and-primary-navigation
  - 0000084-rebuild-home-as-the-scaffold-connection-experience
  - 0000085-rebuild-profiles-and-subscriptions-as-the-connections-experience
  - 0000086-implement-scaffold-action-import-export-edit-and-sort-drawers
  - 0000087-rebuild-settings-diagnostics-and-logs-in-the-scaffold-hierarchy
parent: 0000081-build-the-shared-rahrow-product-interface-and-design-system
directories:
  - packages/features
  - packages/ui
  - apps/desktop
  - apps/mobile
  - tests
projects:
  - rahrow-uiux
  - rahrow-phase-06-verification-and-release-gates
---

Add focused behavior and architecture tests plus visual review at representative mobile and desktop widths. Prove both apps import the same AppShell and CSS Modules; reject lucide-react, raw Tailwind utility soup in feature TSX, app-local product styles, custom overlay markup, and duplicated screens. Exercise keyboard navigation, focus restoration, reduced motion, safe areas, RTL, light/dark themes, connected/error/loading/empty states, unsupported native capabilities, and destructive confirmations. Acceptance: targeted package tests, typechecks, builds, root architecture checks, git diff --check, and visual review against the documented RahRow design system all pass.
