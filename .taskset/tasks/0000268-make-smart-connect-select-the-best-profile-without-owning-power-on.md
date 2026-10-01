---
id: 0000268-make-smart-connect-select-the-best-profile-without-owning-power-on
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
  - 0000242-implement-smart-connect-selection-and-five-minute-pacing
  - 0000210-implement-an-atomic-active-connection-reconfiguration-state-machine
parent: 0000239-post-connect-intelligence-and-background-smart-connect
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
