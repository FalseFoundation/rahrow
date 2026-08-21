---
name: taskset
description: Taskset workflow guidance for agents that need to create, inspect, validate, or update repository tasks stored in .taskset/.
---

# Taskset

Use this skill when working in a repository that uses Taskset to store work as human-readable Markdown beside the code.

## Core Rules

- Treat `.taskset/tasks/` as the canonical task source of truth.
- Treat `taskset.config.ts` as the repository entrypoint for Taskset behavior and defaults.
- Do not create a second task store, hidden database, or alternate sync layer.
- Use Taskset commands to inspect and mutate tasks instead of editing canonical task files by hand when a command exists.
- Prefer `pnpm exec taskset` in project repositories; use the repo root `pnpm taskset` script when available.

## Recommended Workflow

1. Confirm the repository root and Taskset config.
2. Inspect repository health with `taskset config --json` and `taskset doctor`.
3. List or show tasks before changing them.
4. Create, update, or close tasks with Taskset commands.
5. Re-run validation after edits and keep Git as the collaboration and history layer.

## Common Commands

```bash
pnpm exec taskset config --json
pnpm exec taskset doctor
pnpm exec taskset task list
pnpm exec taskset task show <task-id>
pnpm exec taskset task create --title "Describe the work"
pnpm exec taskset task update <task-id> --status doing
pnpm exec taskset task status <task-id> done
pnpm exec taskset task delete <task-id>
pnpm exec taskset task list --file packages/core --impact
```

## Practical Guidance

- Use `--json` for automation and agent handoffs.
- Use `task list --impact` when file or directory changes should surface dependent work.
- Keep task metadata versionless and let Taskset validate schema and path rules.
- When a task change affects repository behavior, follow up with the relevant tests, docs, and `git diff --check`.

## Agent Checklist

- Read the task and the surrounding repository context first.
- Prefer the smallest Taskset command that proves the intended state.
- Avoid editing generated output, caches, or any non-canonical `.taskset/` artifacts.
- Report validation failures plainly and only claim success after the command has run.