---
id: TS-01M0QTQ96WZG5EWKNA84RWWXWJ
title: Finalize ProxyEngine contract and future-engine seam
status: done
priority: high
risk: high
createdAt: 2026-08-23 17:29 UTC
updatedAt: 2026-08-23 18:45 UTC
labels:
  - prod-grade
  - engine
  - architecture
  - p0-release-blocker
dependsOn:
  - TS-01M0QTP80837G4VSWNK02ERXJW
  - TS-01M0QTPNNCCJ5FGVMNZ1C556F9
parent: TS-01M0QTNQ6P1VF8S21D8EVXRJ1T
directories:
  - packages/core
  - packages/engine
  - apps/cli
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-engine
---

Lock the app-facing engine contract before runtime hardening. Acceptance: app and CLI code depend on ProxyEngine behavior, not Xray internals; engine errors, status, restart, latency, cancellation, and unsupported profiles are contract-tested.
