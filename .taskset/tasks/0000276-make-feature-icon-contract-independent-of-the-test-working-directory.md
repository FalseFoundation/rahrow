---
id: 0000276-make-feature-icon-contract-independent-of-the-test-working-directory
title: Make feature icon contract independent of the test working directory
status: done
priority: high
createdAt: 2026-09-14 00:44 UTC
updatedAt: 2026-09-14 00:48 UTC
labels:
  - uiux
  - testing
related:
  - 0000273-audit-remaining-redundant-title-tooltips-on-icon-only-controls
directories:
  - packages/features/src
projects:
  - rahrow-uiux
---

## Outcome

Resolve the feature source tree relative to the test module so the icon-action contract runs from the package and repository roots.

## Acceptance criteria

- The feature test suite no longer constructs a duplicated packages/features/packages/features path.
- The complete @rahrow/features test suite passes.
