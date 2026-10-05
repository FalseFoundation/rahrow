---
id: f48496
type: lesson
title: Source exports use transit tasks instead of caret dependencies
status: active
owner: junkieshuffle
createdAt: 2026-10-05 09:46 UTC
updatedAt: 2026-10-05 09:46 UTC
labels:
  - tooling
related:
  - 5fcd40
  - d1cc4f
  - 4a17f7
files:
  - turbo.json
severity: medium
relatedSkills:
  - .agents/skills/rahrow-implement/references/workflow-and-conventions.md
---

## Trigger / symptom

`turbo run build`, `typecheck`, or `test` waits for the same task in every dependency even though the package imports TypeScript source rather than `dist`.

## Incorrect pattern

Set `dependsOn` to `^build`, `^typecheck`, or `^test` for packages whose exports point at source files.

## Correct pattern

Register a script-less `transit` task with `dependsOn: ["^transit"]`. Point `build`, `typecheck`, and `test` at `transit`. Use a same-package or explicit package edge only when a command needs another command's files, such as desktop `bundle` waiting for `build` and `validate:engine-configs`.

## Blast radius / severity

A caret edge serializes the whole workspace task and makes cache invalidation look like a build dependency. The graph is slower on every clean run. Severity is medium because the tasks still pass; they just do unnecessary work.

## Prevention

When a package exports `"./*": "./src/*"`, do not add `^build`, `^typecheck`, or `^test`. Follow `.agents/skills/rahrow-implement/references/workflow-and-conventions.md`.

## Evidence

Dry-run of `turbo run build --filter=@rahrow/desktop` shows `@rahrow/desktop#build` depending on `@rahrow/desktop#transit`, not on dependency `build` scripts. Installed Turbo docs describe this under transit nodes in configuring tasks.
