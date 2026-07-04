# Agent Guidance

## Purpose
Maintain architecture boundaries for apps/mobile.

## Responsibilities
- Keep this workspace focused on presentation and app orchestration.
- Consume other workspaces through public package exports.
- Keep dependency declarations explicit.

## What Not To Do
- Do not implement protocol, networking, or runtime binaries here.
- Do not import private source paths from other workspaces.
- Do not depend on another app workspace.

## Allowed Dependencies
- packages/* public exports through workspace dependencies.
- Platform SDK dependencies required by this app.

## Forbidden Dependencies
- Any other app workspace.
- Deep imports into another workspace internals.

## Architectural Boundaries
UI -> business packages -> platform packages -> runtime manager interfaces.
