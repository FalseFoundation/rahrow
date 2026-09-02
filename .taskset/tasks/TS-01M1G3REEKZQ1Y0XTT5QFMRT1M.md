---
id: TS-01M1G3REEKZQ1Y0XTT5QFMRT1M
title: Remove useOverlayPresence after proving it is unused
status: todo
priority: low
risk: low
createdAt: 2026-09-02 03:49 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - cleanup
  - overlay
  - dead-code
  - ui
parent: TS-01M1AM68XJ5G8CNBTBZ84C12EM
directories:
  - packages/ui
  - packages/features
projects:
  - rahrow-uiux
  - rahrow-phase-02-light-ui-and-copy
---

Confirm useOverlayPresence has no runtime, test, story, registry, or external package consumers. If unused, delete the hook and its exports, tests, documentation, and stale call-site scaffolding. If a real consumer remains, keep it and record the ownership reason instead of forcing removal.

Acceptance: no unresolved imports or public API breakage, overlay enter/exit behavior remains owned by the active primitive, and package boundaries stay clean.
