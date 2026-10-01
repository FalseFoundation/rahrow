---
id: 0000026-audit-production-architecture-boundaries
title: Audit production architecture boundaries
status: done
priority: high
risk: high
createdAt: 2026-08-23 17:28 UTC
updatedAt: 2026-08-23 18:29 UTC
labels:
  - prod-grade
  - architecture
  - testing
dependsOn: []
parent: 0000025-make-rahrow-production-grade
directories:
  - packages/core
  - packages/engine
  - apps
  - tests
projects:
  - rahrow-production
---

Add automated production boundary checks. Acceptance: tests prove core has no React, Tauri, Capacitor, Vite, browser, Node, or native dependencies; engine depends on core contracts only; apps do not duplicate domain logic; package exports keep "./*": "./src/*".
