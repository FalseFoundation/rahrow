---
id: TS-01M1G3RBD5AGQTHBMAPMEXTK0E
title: Reset Add Connection after a successful import
status: todo
priority: high
risk: medium
createdAt: 2026-09-02 03:49 UTC
updatedAt: 2026-09-02 03:52 UTC
labels:
  - connections
  - import
  - form-state
  - drawer
  - reported-regression
related:
  - TS-01M17F41HXPNCYST5W4SWZY0EG
parent: TS-01M1ARQ5KC8Z4C70KN5N5871B6
directories:
  - packages/features/src/profiles
  - packages/features/src/subscriptions
projects:
  - rahrow-uiux
  - rahrow-phase-02-light-ui-and-copy
---

Reset the Add Connection workflow only after a confirmed successful import. Clear URL and manual fields, validation messages, parsed previews, QR state, active protocol/type, pending flags, and nested step history so reopening starts clean. Preserve user input on failure or cancellation and prevent stale asynchronous completion from clearing a newer attempt.

Acceptance covers URL, QR, paste, file, and manual flows; consecutive imports; drawer close/reopen; mobile back gestures; and RTL.
