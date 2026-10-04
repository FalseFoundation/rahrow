---
id: e1b2fd
title: Build the shared RahRow product interface and design system
status: doing
priority: high
risk: high
createdAt: 2026-08-26 18:24 UTC
updatedAt: 2026-09-02 16:47 UTC
labels:
  - ui-refresh
  - shadcn
  - visual-parity
related:
  - a27174
directories:
  - packages/ui
  - packages/features
  - apps/desktop
  - apps/mobile
projects:
  - rahrow-uiux
  - rahrow-phase-02-light-ui-and-copy
---

Epic: deliver RahRow’s shared production interface across the desktop and mobile apps. Shared product UI stays in packages/features with colocated CSS Modules for layout and composition. All visual primitives, semantic colors, state treatments, typography, radii, and reusable variants come from @rahrow/ui. Desktop and mobile remain thin shells mounting the same route tree. Preserve real Home, Connections, Subscriptions, Import, Diagnostics, Logs, and Settings behavior while presenting Home, Connections, and Settings as primary navigation; secondary workflows open as nested routes or accessible drawers. Acceptance: both apps follow the documented RahRow design system at supported breakpoints; no Lucide dependency; no custom feature-level primitive styling; Hugeicons only; behavior remains wired to existing hooks/runtime capabilities; accessibility and shared-app parity checks pass.
