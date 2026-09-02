---
id: TS-01M1AMRDX2DS51W5FQHMXJTGQ5
title: Give composed feature components matching CSS Modules
status: done
priority: medium
risk: medium
createdAt: 2026-08-31 00:50 UTC
updatedAt: 2026-08-31 04:20 UTC
labels:
  - architecture-audit
  - css-modules
  - features
  - ownership
dependsOn:
  - TS-01M1AMRB9WRQ3JBM7PV67G9RTD
parent: TS-01M1AM68XJ5G8CNBTBZ84C12EM
files:
  - packages/features/src/profiles/ProfileManagement.tsx
  - packages/features/src/profiles/Profiles.module.css
  - packages/features/src/import/StandardProtocolEditor.tsx
  - packages/features/src/import/ConnectionImportDrawer.module.css
  - packages/features/src/app/router.tsx
  - packages/features/src/app/AppShell.module.css
directories:
  - packages/features/src/profiles
  - packages/features/src/import
  - packages/features/src/app
projects:
  - rahrow
---

## Context
Several composed components consume another component's stylesheet: ProfileManagement uses Profiles.module.css, StandardProtocolEditor uses ConnectionImportDrawer.module.css, and router.tsx owns AppShell layout while using AppShell.module.css.

## Scope
- After connection-library decomposition, assign layout classes to matching component CSS Modules.
- Move only the selectors owned by each component; retain shared primitive styling in `@rahrow/ui`.
- Avoid duplicated selectors and app-shell overrides.
- Keep CSS Modules colocated and imported as `styles`.

## Acceptance criteria
- Every composed feature component with owned layout imports a matching-stem CSS Module.
- No feature reaches into a sibling component's private stylesheet.
- Desktop and mobile render the same shared CSS.
- Responsive, safe-area, drawer, virtualization, and empty-state layouts do not regress.

## Verification
Run feature tests/typecheck, build desktop/mobile, perform targeted visual checks at narrow and desktop widths, and run `git diff --check`.
