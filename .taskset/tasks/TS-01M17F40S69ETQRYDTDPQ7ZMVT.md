---
id: TS-01M17F40S69ETQRYDTDPQ7ZMVT
title: Unify dark theme and connection-aware semantic colors
status: done
priority: high
risk: medium
createdAt: 2026-08-29 19:14 UTC
updatedAt: 2026-08-30 21:21 UTC
labels:
  - ui-refresh
  - theme
  - shadcn
related:
  - TS-01M1A8DW05SXPM1X974A6V65ET
parent: TS-01M0ZN2HRE96PN6HY45XKQYM7N
directories:
  - packages/ui
  - packages/features
projects:
  - rahrow-uiux
---

Use the exact requested neutral Shadcn light/dark OKLCH palette while disconnected or transitional, make dark the initial theme, and remap the shared primary semantic color to connected blue (OKLCH equivalent of #4361ee) only while connected. Remove the superseded yellow/green state colors. Keep one document-level connection-state attribute, shared design tokens, accessible contrast, and focused tests. This requirement supersedes the task's original yellow/green direction and is revised by TS-01M1A8DW05SXPM1X974A6V65ET.
