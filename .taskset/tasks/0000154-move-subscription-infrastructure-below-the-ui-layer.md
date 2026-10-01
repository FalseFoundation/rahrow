---
id: 0000154-move-subscription-infrastructure-below-the-ui-layer
title: Move subscription infrastructure below the UI layer
status: done
priority: high
risk: high
createdAt: 2026-08-31 00:48 UTC
updatedAt: 2026-08-31 01:35 UTC
labels:
  - ui
  - architecture
  - impeccable
parent: 0000143-run-exhaustive-impeccable-ui-and-ux-hardening-program
directories:
  - packages
projects:
  - rahrow-uiux
---

Relocate the HTTP subscription fetcher and subscription storage adapter into their owning lower-level packages, update both app runtimes, preserve public contracts, and add tests/changeset if required.
