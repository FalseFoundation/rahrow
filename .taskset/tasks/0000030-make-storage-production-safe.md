---
id: 0000030-make-storage-production-safe
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
  - 0000027-harden-core-domain-and-profile-validation
parent: 0000025-make-rahrow-production-grade
directories:
  - packages/core
projects:
  - rahrow-core
---

Harden local profile and settings persistence. Acceptance: profile/settings persistence handles invalid JSON, schema migration defaults, duplicate IDs, atomic writes where supported, backup/recovery behavior, and clear user-facing failure mapping.
