---
id: 0000179-audit-and-correct-action-icons-across-all-product-screens
title: Audit and correct action icons across all product screens
status: done
priority: high
risk: medium
createdAt: 2026-08-31 01:14 UTC
updatedAt: 2026-08-31 02:02 UTC
labels:
  - icons
  - ui-system
  - accessibility
  - consistency
related:
  - 0000082-define-the-scaffold-visual-contract-in-rahrow-ui
parent: 0000143-run-exhaustive-impeccable-ui-and-ux-hardening-program
files:
  - packages/ui/src/components/rahrow-icons.tsx
  - packages/features/src/profiles/ProfileManagement.tsx
  - packages/features/src/home/Home.tsx
  - packages/features/src/settings/Settings.tsx
  - packages/features/src/diagnostics/Diagnostics.tsx
  - packages/features/src/logs/Logs.tsx
  - packages/features/src/import/ConnectionImportDrawer.tsx
  - packages/features/src/share/ShareDrawer.tsx
directories:
  - packages/ui/src/components
  - packages/features/src
projects:
  - rahrow-uiux
---

## Purpose

Audit every visible product action and replace semantically misleading icons. The known defect is Duplicate using PinActionIcon; the task covers the full shared interface so equivalent mismatches are corrected consistently.

## Audit method

- Inventory icons by screen, action label, accessible name, current glyph, intended meaning, and interaction type.
- Cover Home, Connections, Subscriptions, Import, profile editor, action drawers, Share, Settings, Diagnostics, Logs, headers, navigation, empty states, confirmations, and error recovery.
- Prefer familiar literal metaphors: duplicate/copy, edit/pencil, delete/trash, refresh, test/latency, import/upload, export/download, share, QR, search, filter, settings, info, close, back, more, lock, and connection/power.
- Use DuplicateIcon or another actual duplicate glyph for Duplicate; remove PinActionIcon unless a real pin action exists.
- Keep icon wrappers in rahrow-icons and export semantic product names. Feature components must not import raw third-party icon definitions.
- Avoid using one glyph for conflicting adjacent actions. Decorative icons are aria-hidden; icon-only buttons have specific accessible names and consistent title/tooltip treatment.
- Keep stroke weight, optical size, directionality, and button sizing consistent. Verify back/forward icons under RTL.
- Do not add a new icon library unless the current set genuinely lacks a required semantic glyph.

## Acceptance criteria

- The inventory is captured in the task implementation notes or focused tests and has no unexplained action/glyph mismatch.
- Duplicate never renders a pin glyph; every action drawer label matches its icon.
- Static tests map critical action labels to semantic wrappers and prevent the known regression.
- Accessibility tests find no unlabeled icon-only actions or duplicate ambiguous names in one view.
- Visual checks cover desktop/mobile, light/dark, RTL, 200 percent zoom, and disabled/loading states.
