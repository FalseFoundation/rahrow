---
id: TS-01M0R1QFF9P2PTQREKTJ6D22B6
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
  - TS-01M0R1QC1VHGH6HV67MPTB7C4K
parent: TS-01M0R1JR37H6GZPSGHBT87H900
directories:
  - packages/features
projects:
  - rahrow-uiux
---

Home is connection-first: current state, Connect/Disconnect, selected profile, latency, and quick profile selection.

Use CSS Modules for layout. Logic lives in hooks/feature models, not the screen file.

Acceptance: desktop and mobile Home are the same component; Connect exists; local UI state stays out of core.
