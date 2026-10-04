---
id: a3033b
title: Decompose the connection library without behavior drift
status: done
priority: high
risk: high
createdAt: 2026-08-31 00:48 UTC
updatedAt: 2026-08-31 01:25 UTC
labels:
  - ui
  - architecture
  - impeccable
parent: 6061f4
directories:
  - packages/features/src/profiles
projects:
  - rahrow-uiux
---

Characterize public behavior, split the oversized library into model/hook/group/list/row/drawer seams, remove dead export state, and preserve virtualization and ownership semantics.
