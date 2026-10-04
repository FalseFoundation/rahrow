---
id: d04219
title: Expand settings for routing mode, ports, and UI preferences
status: done
priority: high
risk: high
createdAt: 2026-08-23 19:30 UTC
updatedAt: 2026-08-23 20:13 UTC
labels:
  - prod-v2
  - core
  - p1-product
parent: 944fdd
directories:
  - packages/core
projects:
  - rahrow-core
---

Extend settings beyond activeProfileId/localPort/engineId: routing mode, language, theme, system-proxy preference, start-on-launch flag.

Acceptance: Zod-validated; persisted as untrusted input; unused by ads/engine JSON.
