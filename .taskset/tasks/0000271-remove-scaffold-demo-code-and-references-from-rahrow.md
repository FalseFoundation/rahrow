---
id: 0000271-remove-scaffold-demo-code-and-references-from-rahrow
title: Remove scaffold-demo code and references from RahRow
status: done
priority: high
risk: medium
createdAt: 2026-09-02 15:49 UTC
updatedAt: 2026-09-02 16:47 UTC
labels:
  - cleanup
  - scaffold-demo
  - demo-app
  - workspace
  - uiux
related:
  - 0000088-verify-rahrow-interface-accessibility-and-shared-app-parity
parent: 0000081-build-the-shared-rahrow-product-interface-and-design-system
directories:
  - apps/demo
  - packages/ui
  - packages/features
  - docs
  - .github
projects:
  - rahrow-uiux
  - rahrow-phase-02-light-ui-and-copy
---

Remove the scaffold-demo application, package references, copied assets, fixture-only code, scripts, workspace entries, Turbo tasks, TypeScript paths, test configuration, screenshots, generated artifacts, documentation, and wording that treats scaffold-demo as a product dependency or continuing source of truth.

Before deletion, preserve only production-owned components, tokens, behavior, and visual decisions that RahRow now uses; move them to their correct packages without retaining scaffold naming or cross-package imports. Update the active UI program and verification tasks to describe the RahRow design system directly. Acceptance: no runtime, build, package, documentation, task, or release artifact depends on scaffold-demo, and repository discovery presents only supported RahRow apps.
