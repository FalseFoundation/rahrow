---
id: 0000027-harden-core-domain-and-profile-validation
title: Harden core domain and profile validation
status: done
priority: high
risk: high
createdAt: 2026-08-23 17:29 UTC
updatedAt: 2026-08-23 18:32 UTC
labels:
  - prod-grade
  - core
  - security
  - p0-release-blocker
dependsOn:
  - 0000026-audit-production-architecture-boundaries
parent: 0000025-make-rahrow-production-grade
directories:
  - packages/core
projects:
  - rahrow-core
---

Harden domain schemas and error contracts for production input. Acceptance: ConnectionProfile, settings, endpoint, transport, security, and metadata validation reject malformed or hostile persisted/imported data with stable typed errors.
