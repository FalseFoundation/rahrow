---
id: TS-01M1G3RE3X2NHM39Q4RY5YF1SY
title: Make Smart Connect select the best profile without owning power-on
status: done
priority: urgent
risk: high
createdAt: 2026-09-02 03:49 UTC
updatedAt: 2026-09-02 16:49 UTC
labels:
  - smart-connect
  - profile-selection
  - connection-lifecycle
  - state-machine
related:
  - TS-01M1FPKW9GTAEBR2TXMXSZXVJD
  - TS-01M1FD3JD0BT06B61D728V1H37
parent: TS-01M1FPJKQ2DC8PQANDK2RVA27C
directories:
  - packages/core/src/connection
  - packages/features/src/home
  - packages/features/src/profiles
  - apps/cli
projects:
  - rahrow-core
  - rahrow-cross-platform-hardening
  - rahrow-phase-03-product-state-and-data
---

Narrow Smart Connect to measuring eligible candidates and selecting the best profile. It must not power on a disconnected VPN/proxy engine. If a session is already active, applying the winner may use the shared atomic reconfiguration state machine; if disconnected, only selection changes and the user remains in control of Connect.

Define manual, scheduled, background, CLI, cancellation, no-winner, locked-profile, and current-winner semantics. Copy and progress must say testing/selecting rather than imply automatic power-on.
