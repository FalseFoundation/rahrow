---
id: 0000109-unify-app-shell-headers-safe-areas-and-nested-navigation
title: Unify app shell headers safe areas and nested navigation
status: done
priority: high
risk: medium
createdAt: 2026-08-29 19:14 UTC
updatedAt: 2026-08-29 19:26 UTC
labels:
  - ui-refresh
  - navigation
  - mobile
parent: 0000081-build-the-shared-rahrow-product-interface-and-design-system
directories:
  - packages/features
  - packages/ui
  - apps/mobile
projects:
  - rahrow-uiux
---

Create one shared header and search treatment for Home Connections and Settings, remove repeated Settings links, fix mobile safe-area edge gaps, place Diagnostics under the App settings category, remove wasteful subpage cards, revise subpage headers, hide the main bottom tabs on nested routes, and show a bottom-left back action in their place. Unsupported OS capabilities must be omitted rather than disabled; add or extend platform capability contracts when native detection is required.
