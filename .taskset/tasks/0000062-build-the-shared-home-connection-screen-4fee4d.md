---
id: 4fee4d
title: Build the shared Home connection screen
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:31 UTC
updatedAt: 2026-08-23 22:21 UTC
labels:
  - prod-v2
  - ux
  - css-modules
  - p0-blocker
dependsOn:
  - 33ec61
parent: a27174
directories:
  - packages/features
projects:
  - rahrow-uiux
---

Home is connection-first: current state, Connect/Disconnect, selected profile, latency, and quick profile selection.

Use CSS Modules for layout. Logic lives in hooks/feature models, not the screen file.

Acceptance: desktop and mobile Home are the same component; Connect exists; local UI state stays out of core.
