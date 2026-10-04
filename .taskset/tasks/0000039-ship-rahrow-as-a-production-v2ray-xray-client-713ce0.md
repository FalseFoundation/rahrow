---
id: 713ce0
title: Ship RahRow as a production V2Ray/Xray client
status: doing
priority: high
risk: high
createdAt: 2026-08-23 19:24 UTC
updatedAt: 2026-09-02 03:51 UTC
labels:
  - prod-v2
  - p0-blocker
related:
  - 9395f1
directories:
  - packages/core
  - packages/engine
  - packages/features
  - packages/ui
  - apps/cli
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-production
  - rahrow-phase-07-production-and-distribution
---

Remaining ship program. Previous production tasks completed contracts, stubs, and automated checks. This program tracks work still required to ship a usable production client: complete core/protocol/engine behavior, durable persistence, real Xray runtime, native desktop/mobile edges, identical desktop/mobile product UI in packages/features with CSS Modules, CLI runtime, tests, and release.

Desktop and mobile must look identical. Shared screens, routes, layout, and CSS Modules live in packages/features. Apps are thin platform shells.

The unsigned artifact pipeline is ready (TS-01M0R1K7CHDJFFAGECXS1V6ND2). Signed installers, notarization, and store packages remain blocked on TS-01M0R1RHK86AW8PKX5DG940EXS. iOS Network Extension remains blocked. Do not mark this epic done while signing is blocked. Do not close the root ship task.

Blocked only where credentials, signing, notarization, or store VPN entitlements are required.
