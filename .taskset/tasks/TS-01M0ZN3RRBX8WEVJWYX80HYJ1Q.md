---
id: TS-01M0ZN3RRBX8WEVJWYX80HYJ1Q
title: Verify RahRow interface accessibility and shared-app parity
status: doing
priority: high
risk: medium
createdAt: 2026-08-26 18:25 UTC
updatedAt: 2026-09-02 16:47 UTC
labels:
  - ui-refresh
  - shadcn
  - accessibility
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
  - tests
projects:
  - rahrow-uiux
  - rahrow-phase-06-verification-and-release-gates
---

Add focused behavior and architecture tests plus visual review at representative mobile and desktop widths. Prove both apps import the same AppShell and CSS Modules; reject lucide-react, raw Tailwind utility soup in feature TSX, app-local product styles, custom overlay markup, and duplicated screens. Exercise keyboard navigation, focus restoration, reduced motion, safe areas, RTL, light/dark themes, connected/error/loading/empty states, unsupported native capabilities, and destructive confirmations. Acceptance: targeted package tests, typechecks, builds, root architecture checks, git diff --check, and visual review against the documented RahRow design system all pass.
