---
id: 0000257-support-deliberate-touch-hold-hints-without-duplicate-webview-tooltips
title: Support deliberate touch-hold hints without duplicate WebView tooltips
status: done
priority: high
risk: high
createdAt: 2026-09-02 03:49 UTC
updatedAt: 2026-09-10 17:47 UTC
labels:
  - tooltip
  - touch
  - accessibility
  - base-ui
  - shadcn
  - platform-android
  - platform-ios
  - platform-desktop
related:
  - 0000207-give-icon-only-actions-consistent-tooltip-and-focus-semantics
  - 0000230-use-concise-generic-labels-for-profile-and-subscription-actions
parent: 0000143-run-exhaustive-impeccable-ui-and-ux-hardening-program
directories:
  - packages/ui/src/components/ui
  - packages/features/src
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-uiux
  - rahrow-cross-platform-hardening
  - rahrow-phase-01-idea-and-research
---

## Changes made
- Updated `packages/ui/src/components/ui/icon-action.tsx` to stop emitting `title` on icon-only buttons.
- Kept shared `Tooltip` composition intact in `IconAction` so hover/focus tooltips still appear where intended.
- Updated dependent tests to assert accessibility labels and behavior without redundant `title` assertions (`packages/ui/src/components/ui/icon-action.test.tsx`, `packages/features/src/profiles/ConnectionGroup.test.tsx`, `packages/features/src/profiles/ConnectionProfileList.test.tsx`).

## Validation
- `pnpm taskset task update TS-01M1G3RABPAJHABBEQV4YNREN0 --status done`
- `pnpm vitest run packages/ui/src/components/ui/icon-action.test.tsx`
- `pnpm vitest run packages/features/src/app/icon-action-contract.test.tsx packages/features/src/profiles/ConnectionGroup.test.tsx packages/features/src/profiles/ConnectionProfileList.test.tsx`
