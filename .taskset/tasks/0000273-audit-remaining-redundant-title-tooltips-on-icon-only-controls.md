---
id: 0000273-audit-remaining-redundant-title-tooltips-on-icon-only-controls
title: Audit remaining redundant title tooltips on icon-only controls
status: done
priority: high
risk: high
createdAt: 2026-09-10 17:47 UTC
updatedAt: 2026-09-10 17:54 UTC
labels:
  - uiux
  - accessibility
related:
  - 0000207-give-icon-only-actions-consistent-tooltip-and-focus-semantics
parent: 0000257-support-deliberate-touch-hold-hints-without-duplicate-webview-tooltips
directories:
  - packages/ui/src/components/ui
  - packages/features/src
projects:
  - rahrow-uiux
---

## What changed

- Removed redundant native `title` tooltips from icon-only controls where an explicit `aria-label` and shared tooltip contract already exist.
- Kept semantic labels/tooltip behavior intact.

### Files updated

- `packages/features/src/home/Home.tsx`
  - Removed `title={connectionActionLabel}` from the large connect/disconnect icon button (accessible label remains).
- `packages/ui/src/components/ui/sidebar.tsx`
  - Removed `title='Toggle Sidebar'` from the sidebar rail icon button (kept `aria-label`).
- `packages/features/src/app/action-icons.contract.test.ts`
  - Updated the IconAction contract expectation to no longer require `title={label}` in source.

### Notes

- This addresses remaining icon-only control cases not covered by the previous IconAction source-level migration.
- No behavior changes to command actions or navigation were introduced.
