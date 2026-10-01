---
id: 0000190-unify-import-form-and-error-semantics
title: Unify import form and error semantics
status: done
priority: high
risk: high
createdAt: 2026-08-31 02:00 UTC
updatedAt: 2026-08-31 04:05 UTC
labels:
  - p1
  - hardening
  - accessibility
parent: 0000143-run-exhaustive-impeccable-ui-and-ux-hardening-program
directories:
  - packages/features/src/import
projects:
  - rahrow-uiux
---

Make URL acquisition a native form with Enter submit, handle paste/import failures with visible alerts and recovery, keep raw native details secondary, and remove role=img around interactive QR camera recovery.
