---
id: TS-01M0QTQ20XC832MAR5ST120D7P
title: Make storage production-safe
status: done
priority: high
risk: high
createdAt: 2026-08-23 17:29 UTC
updatedAt: 2026-08-23 18:42 UTC
labels:
  - prod-grade
  - storage
  - security
  - p0-release-blocker
dependsOn:
  - TS-01M0QTPF662C3D9885ESQV0RSB
parent: TS-01M0QTNQ6P1VF8S21D8EVXRJ1T
directories:
  - packages/core
projects:
  - rahrow-core
---

Harden local profile and settings persistence. Acceptance: profile/settings persistence handles invalid JSON, schema migration defaults, duplicate IDs, atomic writes where supported, backup/recovery behavior, and clear user-facing failure mapping.
