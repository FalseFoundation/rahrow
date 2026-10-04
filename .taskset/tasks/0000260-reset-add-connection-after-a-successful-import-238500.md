---
id: "238500"
title: Reset Add Connection after a successful import
status: done
priority: high
risk: medium
createdAt: 2026-09-02 03:49 UTC
updatedAt: 2026-09-02 16:49 UTC
labels:
  - connections
  - import
  - form-state
  - drawer
  - reported-regression
related:
  - c032e5
parent: dab520
directories:
  - packages/features/src/profiles
  - packages/features/src/subscriptions
projects:
  - rahrow-uiux
  - rahrow-phase-02-light-ui-and-copy
---

Reset the Add Connection workflow only after a confirmed successful import. Clear URL and manual fields, validation messages, parsed previews, QR state, active protocol/type, pending flags, and nested step history so reopening starts clean. Preserve user input on failure or cancellation and prevent stale asynchronous completion from clearing a newer attempt.

Acceptance covers URL, QR, paste, file, and manual flows; consecutive imports; drawer close/reopen; mobile back gestures; and RTL.
