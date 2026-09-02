---
id: TS-01M0QTR591JEVY8C5G423WJSB9
title: Finalize CLI as production automation surface
status: done
priority: medium
risk: medium
createdAt: 2026-08-23 17:30 UTC
updatedAt: 2026-08-23 18:50 UTC
labels:
  - prod-grade
  - cli
  - automation
  - p1-hardening
dependsOn:
  - TS-01M0QTPWAZNV0FEH15DS91C7CB
  - TS-01M0QTQ20XC832MAR5ST120D7P
  - TS-01M0QTQF1M5EGGJ05R91X68RPY
parent: TS-01M0QTNQ6P1VF8S21D8EVXRJ1T
directories:
  - apps/cli
  - packages/core
  - packages/engine
projects:
  - rahrow-interfaces
---

Finalize the CLI as the production automation and smoke-test surface. Acceptance: profiles, import, export, subscription, connect, disconnect, status, and test return stable exit codes, machine-readable JSON where appropriate, and clear stderr messages.
