---
name: taskset
description: Taskset workflow guidance for agents that need to create, inspect, validate, or update repository tasks stored in .taskset/. While executing work, agents must create follow-up tasks or subtasks for newly discovered work.
---

# Taskset

Use this skill when working in a repository that uses Taskset to store work as human-readable Markdown beside the code.

## Core Rules

- Treat `.taskset/tasks/` as the canonical task source of truth.
- Treat `taskset.config.ts` as the repository entrypoint for Taskset behavior and defaults.
- Do not create a second task store, hidden database, or alternate sync layer.
- Use Taskset commands to inspect and mutate tasks instead of editing canonical task files by hand when a command exists.
- Prefer `pnpm taskset` in project repositories; use the repo root `pnpm taskset` script when available.
- While executing or working a task, agents MUST create follow-up Taskset tasks or child subtasks for newly discovered work. Do not leave that work only in chat, memory, or an informal note.

## Recommended Workflow

1. Confirm the repository root and Taskset config.
2. Inspect repository health with `taskset config --json` and `taskset doctor`.
3. List or show tasks before changing them.
4. Create, update, or close tasks with Taskset commands.
5. Re-run validation after edits and keep Git as the collaboration and history layer.

## Common Commands

```bash
pnpm taskset config --json
pnpm taskset doctor
pnpm taskset task list
pnpm taskset task show <task-id>
pnpm taskset task create --title "Describe the work"
pnpm taskset task update <task-id> --status doing
pnpm taskset task status <task-id> done
pnpm taskset task delete <task-id>
pnpm taskset task list --file packages/core --impact
```

## Practical Guidance

- Use `--json` for automation and agent handoffs.
- Use `task list --impact` when file or directory changes should surface dependent work.
- Keep task metadata versionless and let Taskset validate schema and path rules.
- When a task change affects repository behavior, follow up with the relevant tests, docs, and `git diff --check`.

## Task Modeling

- Represent distinct deliverables as separate Taskset tasks instead of placing an entire plan in one raw-text task. Keep one task when the work is genuinely atomic or the items are only completion steps for the same outcome.
- Search existing open and recently completed tasks before creating new ones. Update or relate matching work instead of creating a duplicate; use `--duplicate` only when preserving a separately created duplicate is necessary.
- When a prompt contains many tasks, do not preserve its ordering blindly. Infer the work graph from the requested outcomes and repository context, then assign the appropriate existing labels and projects and record relationships such as `--depends-on`, `--related`, and `--parent`. A task that cannot start until another finishes must depend on that task; prompt order alone does not establish a dependency.
- Use `--depends-on` only for a real execution prerequisite and `--related` for useful context without blocking. Avoid dependency cycles and create prerequisites first when their generated IDs are needed by downstream tasks.
- Inspect existing tasks, labels, projects, and repository conventions before assigning metadata. Reuse established taxonomy and avoid inventing labels, projects, or relationships without supporting context.
- Attach known repository scope with `--file` or `--directory` so impact queries can find the task. Use the narrowest accurate paths and do not guess paths that have not been established.
- Model smaller steps within one task as Markdown checklist items beginning with `- [ ]` in the task body. Use child tasks with `--parent` instead when a subtask needs its own status, ownership, dependencies, or tracking history.
- While working, when new deliverables, prerequisites, blockers, deferred scope, regressions, or verification gaps surface, create follow-up tasks or `--parent` child tasks immediately. Relate them with `--depends-on`, `--related`, or `--parent` as appropriate. Do not finish or abandon the current task without recording that discovered work in Taskset.
- Give each task an outcome-oriented title and enough structured Markdown to make it executable: context or outcome, in-scope work, checklist when useful, observable acceptance criteria, and references. Avoid vague titles and undifferentiated text dumps.
- Preserve links, external URLs, named libraries, and other external mentions from the user's prompt in a `References` section in the relevant task body. Keep enough surrounding description to explain why each reference matters.
- Preserve user-supplied metadata when updating a task unless the requested change supersedes it. Keep the body, checklist state, status, dependencies, and scope consistent; do not mark a task done until its acceptance criteria are satisfied.
- For batch mutations, capture the IDs returned by each successful command and reconcile the current task list after any failure. Resume from the observed state instead of rerunning the whole batch and creating duplicates.
- Prefer closing completed or superseded work through status and relationships so history remains available. Delete a task only when removal is explicitly intended, after checking tasks that depend on it.
- If the prompt is ambiguous about scope or sequencing, record only relationships supported by evidence. Do not turn a guess into a dependency, owner, due date, estimate, or completion claim.
- After creating or changing several tasks, inspect them as a set and verify that identifiers, dependencies, parent-child links, related work, labels, projects, and checklist placement match the inferred work graph.

For multi-task prompts or uncertainty about task granularity and relationships, read [good and bad task-modeling examples](references/task-modeling-examples.md).

## Agent Checklist

- Read the task and the surrounding repository context first.
- While executing, create follow-up tasks or subtasks for every distinct piece of newly discovered work before moving on or closing the current task.
- Prefer the smallest Taskset command that proves the intended state.
- Avoid editing generated output, caches, or any non-canonical `.taskset/` artifacts.
- Report validation failures plainly and only claim success after the command has run.
