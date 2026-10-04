---
id: 410b33
title: Inject and capability-gate QR image downloads
status: done
priority: high
risk: medium
createdAt: 2026-08-31 00:50 UTC
updatedAt: 2026-08-31 03:14 UTC
labels:
  - architecture-audit
  - sharing
  - qr
  - platform-capability
  - mobile
parent: fc52f1
files:
  - packages/features/src/share/ShareDrawer.tsx
  - packages/features/src/app/runtime.tsx
directories:
  - packages/core/src/platform
  - packages/features/src/share
  - packages/features/src/app
  - apps/desktop
  - apps/mobile
projects:
  - rahrow
---

## Context
The global share drawer always performs QR download through direct DOM anchor manipulation. Download availability and implementation vary across desktop and mobile, while RahRow requires platform calls to be injected and unavailable actions hidden.

## Scope
- Define the smallest download/save-file capability contract in the platform boundary.
- Inject the capability into the share drawer alongside clipboard and system share.
- Implement it at desktop/mobile edges using supported platform facilities; a browser anchor may remain only inside a web capability adapter.
- Hide the QR-download action when unsupported.
- Preserve QR generation, filename sanitization, copy, system share, and lazy secondary copy.

## Acceptance criteria
- ShareDrawer contains no direct `document.createElement('a')` download implementation.
- Download is rendered only when the injected capability reports support.
- Success, cancellation, permission denial, unsupported, and failure paths are covered without false success toasts.
- Desktop and mobile use the same shared drawer UI.
- QR payloads and secrets are not logged.

## Verification
Run share model/component tests, desktop/mobile capability tests and typechecks, cross-interface tests, and `git diff --check`.
