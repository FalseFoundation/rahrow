---
id: 64a98e
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
parent: 6061f4
directories:
  - packages
projects:
  - rahrow-uiux
---

Relocate the HTTP subscription fetcher and subscription storage adapter into their owning lower-level packages, update both app runtimes, preserve public contracts, and add tests/changeset if required.
