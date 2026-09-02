---
id: TS-01M0ZN2HRE96PN6HY45XKQYM7N
title: Rebuild the shared product interface from @rahrow/scaffold-demo
status: doing
priority: high
risk: high
createdAt: 2026-08-26 18:24 UTC
updatedAt: 2026-09-02 03:51 UTC
labels:
  - ui-refresh
  - scaffold-fidelity
  - shadcn
  - visual-parity
related:
  - TS-01M0R1JR37H6GZPSGHBT87H900
directories:
  - apps/demo
  - packages/ui
  - packages/features
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-uiux
  - rahrow-phase-02-light-ui-and-copy
---

Epic: reproduce the scaffold demo product experience in the real desktop and mobile apps without copying its Next.js, Lucide, raw markup, global CSS, or ad hoc Tailwind implementation. Shared product UI stays in packages/features with colocated CSS Modules for layout and composition. All visual primitives, semantic colors, state treatments, typography, radii, and reusable variants come from @rahrow/ui. Desktop and mobile remain thin shells mounting the same route tree. Preserve real Home, Profiles, Subscriptions, Import, Diagnostics, Logs, and Settings behavior while presenting the scaffold information architecture: Home, Connections, and Settings as primary navigation; secondary workflows open as nested routes or accessible drawers. Acceptance: both apps visually match the scaffold at supported breakpoints; no demo imports; no lucide-react; no custom feature-level primitive styling; Hugeicons only; behavior remains wired to existing hooks/runtime capabilities; accessibility and parity checks pass.
