# Agent Guidance

## Purpose
Protect boundaries for packages/analytics.

## Responsibilities
- Keep package scope focused on analytics concerns.
- Export only through package entrypoints.
- Keep dependencies explicit and minimal.

## What Not To Do
- Do not implement unrelated product concerns here.
- Do not depend on app workspaces.
- Do not deep-import internal files from other packages.

## Allowed Dependencies
- Public exports from other packages where layering permits.
- Minimal third-party dependencies justified by this package.

## Forbidden Dependencies
- apps/* workspaces.
- Private internals from any workspace.

## Architectural Boundaries
This package communicates with peers only through declared public contracts.
