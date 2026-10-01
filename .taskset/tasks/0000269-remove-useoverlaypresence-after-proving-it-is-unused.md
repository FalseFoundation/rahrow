---
id: 0000269-remove-useoverlaypresence-after-proving-it-is-unused
title: Remove useOverlayPresence after proving it is unused
status: done
priority: low
risk: low
createdAt: 2026-09-02 03:49 UTC
updatedAt: 2026-09-02 16:45 UTC
labels:
  - cleanup
  - overlay
  - dead-code
  - ui
parent: 0000143-run-exhaustive-impeccable-ui-and-ux-hardening-program
directories:
  - packages/ui
  - packages/features
projects:
  - rahrow-uiux
  - rahrow-phase-02-light-ui-and-copy
---

Confirm useOverlayPresence has no runtime, test, story, registry, or external package consumers. If unused, delete the hook and its exports, tests, documentation, and stale call-site scaffolding. If a real consumer remains, keep it and record the ownership reason instead of forcing removal.\n\nAcceptance: no unresolved imports or public API breakage, overlay enter/exit behavior remains owned by the active primitive, and package boundaries stay clean.\n\nAudit outcome (2026-09-02): keep the hook. The shared UI Drawer is a live runtime consumer and uses it to retain Base UI drawer content through its exit transition before unmount. Codebase graph inbound tracing found Drawer as the sole production owner; removing the hook would regress overlay exit presence rather than remove dead code.
