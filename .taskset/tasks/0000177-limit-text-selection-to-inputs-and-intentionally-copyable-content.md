---
id: 0000177-limit-text-selection-to-inputs-and-intentionally-copyable-content
title: Limit text selection to inputs and intentionally copyable content
status: done
priority: medium
risk: medium
createdAt: 2026-08-31 01:14 UTC
updatedAt: 2026-08-31 03:04 UTC
labels:
  - interaction
  - text-selection
  - accessibility
  - ui
parent: 0000143-run-exhaustive-impeccable-ui-and-ux-hardening-program
files:
  - packages/ui/src/global.css
  - packages/features/src/app/AppShell.module.css
  - packages/ui/src/components/ui/input.tsx
  - packages/ui/src/components/ui/textarea.tsx
  - packages/features/src/logs/Logs.module.css
  - packages/features/src/diagnostics/Diagnostics.module.css
  - packages/features/src/share/ShareDrawer.module.css
directories:
  - packages/ui/src
  - packages/features/src/app
  - packages/features/src/logs
  - packages/features/src/diagnostics
  - packages/features/src/share
projects:
  - rahrow-uiux
---

## Purpose

Prevent accidental selection of application chrome while preserving normal selection, editing, and copying where users reasonably expect it.

## Selection policy

- Apply user-select: none at the app-shell/product-chrome boundary, not to the entire document in a way that breaks native controls or external embeds.
- Explicitly restore text selection for input, textarea, contenteditable, selectable values, code/pre blocks, log messages, diagnostic details, connection addresses, imported/exported URLs, and share previews.
- Buttons, navigation, headings used as chrome, badges, icons, drawer handles, list-row labels, and decorative status text should not become drag-selected during mouse or touch interaction.
- Disabled/read-only inputs remain selectable when their value is useful.
- Preserve platform-native editing menus, cursor placement, long-press selection, copy keyboard shortcuts, screen-reader behavior, drag/drop, and form control semantics.
- Introduce a documented shared opt-in class or data attribute for future copyable text rather than accumulating feature-specific exceptions.

## Acceptance criteria

- Pointer drag over app chrome does not paint a text selection.
- Users can select partial text and copy from all named content surfaces on desktop and mobile.
- Inputs and textareas retain selection, caret, double-click word selection, and keyboard shortcuts.
- Automated style/interaction tests cover the shared opt-in contract; manual checks cover mouse, touch long-press, keyboard, RTL, and nested drawers.
- No broad rule uses pointer-events or event cancellation to simulate non-selection.
