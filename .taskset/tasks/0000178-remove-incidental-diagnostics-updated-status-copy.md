---
id: 0000178-remove-incidental-diagnostics-updated-status-copy
title: Remove incidental Diagnostics updated status copy
status: done
priority: medium
risk: low
createdAt: 2026-08-31 01:14 UTC
updatedAt: 2026-08-31 02:53 UTC
labels:
  - diagnostics
  - ux-copy
  - status
dependsOn:
  - 0000176-show-full-diagnostic-details-with-per-item-copy-actions
related:
  - 0000110-replace-incidental-status-copy-with-purposeful-empty-states
parent: 0000143-run-exhaustive-impeccable-ui-and-ux-hardening-program
files:
  - packages/features/src/diagnostics/Diagnostics.tsx
  - packages/features/src/diagnostics/useDiagnostics.ts
  - packages/features/src/diagnostics/Diagnostics.module.css
  - packages/features/src/diagnostics/Diagnostics.test.tsx
directories:
  - packages/features/src/diagnostics
projects:
  - rahrow-uiux
---

## Purpose

Remove the persistent Diagnostics updated sentence below runtime-health items. A successful refresh is already represented by the updated content and must not consume permanent page space.

## Behavior contract

- Delete the steady-state success message and its visual status paragraph.
- Keep the initial loading and in-progress state on the refresh control and relevant content skeletons.
- Keep refresh failures visible, actionable, and announced with alert semantics; removing success copy must not hide errors.
- If successful completion needs an announcement for assistive technology, use a visually hidden polite live region or a concise toast that does not remain as page content.
- Avoid resetting the message to Diagnostics not run during the automatic initial load.
- Ensure the hook models success, loading, and failure as explicit state rather than retaining a generic message field solely for this sentence.

## Acceptance criteria

- No visible Diagnostics updated or Diagnostics not run text appears below the items after initial load or manual refresh.
- Refresh success updates the snapshot and remains accessible without layout shift.
- Refresh failure remains visible, retryable, and assertively announced.
- Tests assert initial load, repeated successful refresh, failure followed by recovery, and no incidental success paragraph.
