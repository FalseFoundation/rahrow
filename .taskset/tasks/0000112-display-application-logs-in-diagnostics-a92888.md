---
id: a92888
title: Display application logs in Diagnostics
status: done
priority: high
risk: medium
createdAt: 2026-08-29 19:14 UTC
updatedAt: 2026-08-29 19:29 UTC
labels:
  - ui-refresh
  - diagnostics
  - logging
parent: e1b2fd
directories:
  - packages/features
  - packages/core
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-uiux
---

Expose the shared bounded application log buffer through an injected diagnostics capability and render useful logs in the Diagnostics screen with empty loading error copy and export or copy actions where supported. Keep logging behavior outside presentational components and hide actions that the current platform cannot perform.
