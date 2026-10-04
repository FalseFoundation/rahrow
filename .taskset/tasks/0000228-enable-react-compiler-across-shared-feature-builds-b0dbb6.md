---
id: b0dbb6
title: Enable React Compiler across shared feature builds
status: done
priority: high
risk: medium
createdAt: 2026-09-01 22:38 UTC
updatedAt: 2026-09-01 22:48 UTC
labels:
  - react-compiler
  - performance
  - tooling
  - platform-android
  - platform-ios
  - platform-macos
  - platform-linux
  - platform-windows
  - platform-cli
parent: bf02bf
directories:
  - packages/features
  - packages/tooling
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-production
  - rahrow-uiux
---

Enable the supported React Compiler path once in shared Vite/tooling configuration so desktop and mobile feature builds receive identical compilation. CLI is explicitly unaffected because it has no React renderer. Verify compiler compatibility, lint/typecheck/build integration, generated bundle behavior, and interactions with existing memoization; do not add app-specific duplicate configuration or speculative manual memoization.
