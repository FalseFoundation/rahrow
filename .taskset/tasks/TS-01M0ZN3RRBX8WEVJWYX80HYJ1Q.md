---
id: TS-01M0ZN3RRBX8WEVJWYX80HYJ1Q
title: Verify scaffold fidelity, accessibility, and shared-app parity
status: doing
priority: high
risk: medium
createdAt: 2026-08-26 18:25 UTC
updatedAt: 2026-09-02 03:51 UTC
labels:
  - ui-refresh
  - scaffold-fidelity
  - shadcn
dependsOn:
  - TS-01M0ZN3QFR42WZNC7DR8KCP0MK
  - TS-01M0ZN3QQ07972A767SFGRG3NA
  - TS-01M0ZN3QXKDAH5SKXWYS29RKWP
  - TS-01M0ZN3R45BVTMHVC2K1V8485K
  - TS-01M0ZN3RAQ84R822HBJXN2KP2X
  - TS-01M0ZN3RHDBJV14NNFKRT061CZ
parent: TS-01M0ZN2HRE96PN6HY45XKQYM7N
directories:
  - packages/features
  - packages/ui
  - apps/desktop
  - apps/mobile
  - apps/demo
  - tests
projects:
  - rahrow-uiux
  - rahrow-phase-06-verification-and-release-gates
---

Add focused behavior and architecture tests plus a visual review at representative mobile and desktop widths. Prove both apps import the same AppShell and CSS Modules; reject demo imports, lucide-react, raw Tailwind utility soup in feature TSX, app-local product styles, custom overlay markup, and duplicated screens. Exercise keyboard navigation, focus restoration, reduced motion, safe areas, RTL, light/dark themes, connected/error/loading/empty states, unsupported native capabilities, and destructive confirmations. Use the scaffold only as a visual oracle until acceptance, then decide explicitly whether to delete or archive @rahrow/scaffold-demo. Acceptance: targeted package tests/typechecks/builds, root architecture checks, git diff --check, and visual comparison all pass.
