---
id: TS-01M0QTPF662C3D9885ESQV0RSB
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
  - TS-01M0QTP80837G4VSWNK02ERXJW
parent: TS-01M0QTNQ6P1VF8S21D8EVXRJ1T
directories:
  - packages/core
projects:
  - rahrow-core
---

Harden domain schemas and error contracts for production input. Acceptance: ConnectionProfile, settings, endpoint, transport, security, and metadata validation reject malformed or hostile persisted/imported data with stable typed errors.
