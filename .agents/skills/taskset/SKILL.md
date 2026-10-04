---
name: taskset
description: Taskset workflow guidance for agents that plan, research, decide, operate, and track delivery with stories, flows, research, decisions, runbooks, lessons, concerns, audits, and tasks stored in .taskset/, including batch imports and cross-package monorepo work. While executing work, agents must create follow-up tasks or subtasks (Taskset child tasks or body checklist items) for newly discovered work, keep parent and subtask progress current mid-work, mark every finished subtask done or checked, create Taskset documents (research, decision, runbook, story, flow, lesson, concern, or audit) when work produces reusable evidence, lasting choices, procedures, recurring patterns, or residual risks, link them with --related, and update the session or repository primary skill when lasting lessons should prevent future failures (especially when a lesson declares --related-skill).
---

# Taskset

Use this skill when working in a repository that uses Taskset to store plans, research, decisions, runbooks, and executable tasks as human-readable Markdown beside the code. Tasks move delivery. Documents preserve the memory that makes delivery coherent.

## Packaged Docs And Skills

`@taskset/cli` publishes the repository `docs/` and `skills/` trees in the npm
tarball. After `pnpm add --save-dev @taskset/cli` (or an equivalent install),
treat those paths as the detailed offline reference set:

| Path | Contents |
| --- | --- |
| `node_modules/@taskset/cli/skills/taskset/SKILL.md` | This skill (agent workflow for tasks and documents) |
| `node_modules/@taskset/cli/skills/taskset/references/` | Task modeling, document modeling, monorepo, and Changesets examples |
| `node_modules/@taskset/cli/skills/taskset-implement/` | Engineering standards used while developing Taskset itself |
| `node_modules/@taskset/cli/docs/` | Human docs: getting started, configuration, CLI reference, task files, document types, memory model, closeout, taxonomy |
| `node_modules/@taskset/cli/docs/agents/` | Agent docs: workflows, command contracts, query recipes, discovery index |
| `node_modules/@taskset/cli/docs/maintainers/` | Architecture, ADRs, testing, and maintainer workflows |

In the Taskset repository itself, prefer the workspace copies at `skills/` and
`docs/`—they are the canonical sources that the package build copies into
`@taskset/cli`. When working in a consumer repository, load the installed copies
under `node_modules/@taskset/cli/` before inventing workflow or command
behavior. Useful deep links from an installed package:

- CLI contracts: [`docs/cli-reference.md`](../../docs/cli-reference.md) (installed: `node_modules/@taskset/cli/docs/cli-reference.md`)
- Document kinds: [`docs/document-types.md`](../../docs/document-types.md)
- Memory model: [`docs/memory-model.md`](../../docs/memory-model.md)
- Query recipes: [`docs/agents/query-recipes.md`](../../docs/agents/query-recipes.md)
- Agent closeout: [`docs/agent-closeout.md`](../../docs/agent-closeout.md)
- Task file shape: [`docs/task-files.md`](../../docs/task-files.md)
- Task modeling examples: [references/task-modeling-examples.md](references/task-modeling-examples.md)
- Document modeling examples: [references/document-modeling-examples.md](references/document-modeling-examples.md)
- Monorepo modeling: [references/monorepo-task-modeling.md](references/monorepo-task-modeling.md)
- Changesets examples: [references/changesets-examples.md](references/changesets-examples.md)

Relative links inside the packaged skill still resolve against the packaged
`docs/` and `skills/` trees because both directories sit at the `@taskset/cli`
package root.

## Core Rules

- Treat `.taskset/tasks/` as the canonical task source of truth and the sibling
  document-kind directories as the canonical durable project-document source.
- Treat the nearest `.taskset/` directory as the repository marker. Optional
  `taskset.config.ts` at that root overlays defaults; built-in defaults apply
  when it is absent.
- Do not create a second task store, hidden database, or alternate sync layer.
- Use Taskset commands to inspect and mutate tasks instead of editing canonical task files by hand when a command exists.
- Invoke Taskset with whatever runner the environment provides:
  `npx @taskset/cli`, `pnpm dlx @taskset/cli`, `yarn dlx @taskset/cli`,
  `bunx @taskset/cli`, `pnpm exec taskset`, or a global `taskset` binary. Do not
  require `pnpm taskset`.
- While executing or working a task, agents MUST create follow-up Taskset tasks or subtasks for newly discovered work. In this skill, "subtask" means either a Taskset child task (`--parent`) or a Markdown checklist item (`- [ ]`) in the parent task body—choose child tasks when independent status, ownership, dependencies, or history are needed; otherwise prefer checklist items. Do not leave that work only in chat, memory, or an informal note.
- Agents MUST keep the parent task status and every subtask current mid-work: set Taskset tasks and child tasks to `doing` when work starts, check off completed checklist items as `- [x]`, update statuses when progress or blockers change, and mark each finished child task `done` when its acceptance criteria are met. Do not leave finished checklist items unchecked or finished child tasks open, and do not mark a parent task `done` while any tracked subtask (child task or checklist item) remains unfinished.
- While executing a task, agents MUST create a Taskset document in the same change when work produces reusable evidence (`research`), a lasting choice (`decision` / `adr`), an operational procedure (`runbook`), durable product context (`story` / `flow`), a recurring mistake or correct pattern (`lesson`), an open residual risk (`concern`), or structured spot-check evidence (`audit`). Link the document and originating task with `--related`. Do not leave that material only in chat, memory, or a closed task body. Short scratch notes and one-off checklist steps stay in the task body.
- When the repository or current session designates one or more skills as primary, and task work surfaces a lesson that future agents should reuse—tool or command selection, a bug fix pattern, a repeated failure mode, or an architecture decision—create a `lesson` document and update that primary skill (and its relevant references) in the same change so the failure is not rediscovered later. If the lesson uses `--related-skill`, update those skill paths in the same change. Prefer skills for lasting how-to; prefer research/decision documents for what was learned or chosen; prefer `lesson` for recurring incorrect/correct patterns. Taskset never auto-edits skills. Do not leave durable guidance only in a closed task body or chat transcript.

## Recommended Workflow

1. Confirm the repository root with `taskset config --json` (look for `.taskset/`, not a required config file).
2. Inspect repository health with `taskset doctor --json`.
3. List or show tasks and check their owner and assignees before changing or executing them.
4. Resolve whether the current Git user is authorized to take the selected task; obtain confirmation when another person is responsible and the request does not already authorize that specific takeover.
5. Create, update, execute, or close tasks with Taskset commands.
6. Re-run validation after edits and keep Git as the collaboration and history layer.

## Before Executing a Task

- Show the task and resolve `git config --get user.name` before implementation, changing its status to `doing`, or modifying its ownership or assignment. Also check unresolved dependencies and other explicit blockers; matching ownership does not override them.
- The current Git user may proceed when they are an assignee, or when the task has no assignees and they are its owner. A different owner does not block an explicitly assigned executor.
- If another person is the explicit owner and the current Git user is not an assignee, or if the task is assigned only to other people, pause before mutation and ask the user to confirm execution or takeover. Read-only inspection and reporting may continue while awaiting that decision.
- A current instruction that explicitly identifies and authorizes executing that task counts as confirmation. A generic instruction such as “work on the next task,” task visibility, code ownership, or repository access does not override another person's assignment.
- Confirmation to help execute a task does not automatically transfer accountability. Preserve the owner unless reassignment is explicitly requested; update assignees only when the confirmation or repository workflow establishes who will now perform the work.
- If the Git identity is missing or cannot be matched reliably to task identities, state the ambiguity and request confirmation before taking work explicitly assigned to someone else. Do not guess identity from an email, commit history, or hosting-service handle without an established repository mapping.

For ownership-gate scenarios, read [owner and assignee examples](references/task-modeling-examples.md#pre-execution-ownership-check).

## Common Commands

```bash
taskset config --json
taskset doctor --json
taskset task list --json
taskset task show your_task_id_here --json
taskset task create --title "Describe the work"
taskset task update your_task_id_here --status doing
taskset task status your_task_id_here done
taskset task delete your_task_id_here
taskset task list --search "multiple terms" --json
taskset task list --file packages/core --impact --json
taskset document create story --title "Describe the user outcome"
taskset document create research --title "Evaluate options" --related your_task_id_here
taskset document create lesson --title "Capability flags are enablement only" --severity high --related your_task_id_here
taskset document create concern --title "Open authz residual risk" --class authz --related your_task_id_here
taskset document update your_document_id_here --status ready --type research
taskset document list research --search "queue" --impact --json
taskset document list concern --directory apps/foo --status active --json
taskset document show your_document_id_here --type research --include-derived --json
taskset document import docs/adr/0001-example.md --type adr --move
taskset document batch taskset-documents.json --concurrency 4 --json
taskset task program your_parent_task_id_here --json
taskset sync --json
```

## Practical Guidance

- Use `--json` for automation and agent handoffs.
- Array options replace the whole stored array on update; repeat the singular value option once per
  desired value. To empty an array, use the CLI's exact plural clear flag:
  `--clear-dependencies`, `--clear-labels`, `--clear-assignees`, `--clear-reviewers`,
  `--clear-related`, `--clear-files`, `--clear-directories`, or `--clear-projects`.
  Scalar relationships use `--clear-parent` and `--clear-owner`. Do not guess a clear flag from
  the singular setter name or retry an update with an empty string.
- Use multi-term `--search` for discovery on both `task list` and `document list`; every
  normalized term must match the title or body, but the terms may appear in any order or location.
- Use `task list --impact` or `document list --impact` when file, directory, or dependency
  relationships should surface dependent work.
- Keep task and document metadata versionless and let Taskset validate schema and path rules.
- Documents support the same metadata options, clear flags, list filters, sort, search, impact,
  status, update, and delete commands as tasks. Document statuses remain
  `draft`, `ready`, `active`, `accepted`, `superseded`, and `archived`.
- Use `document create` for stories, flows, decisions (`decision`, `adr`, and
  `dr` are aliases), research, runbooks, lessons (`antipattern` alias),
  concerns, and audits. Use `document import` to preserve an existing Markdown
  body in canonical frontmatter; add `--move` only when the source should be
  removed after a successful canonical write.
- Pick the kind by purpose: stories capture user value and acceptance criteria;
  flows describe journeys and failure variants; decisions preserve rationale
  and consequences; research records evidence and recommendations; runbooks
  make repeatable operations and recovery safe; lessons capture recurring
  incorrect/correct patterns; concerns track open residual risk; audits store
  structured inventory or spot-check evidence.
- Use `document batch <manifest.json>` for repeatable multi-document create,
  import, update, and export jobs. Progress belongs on stderr and `--json`
  output on stdout. Use `sync` after upgrades to ensure canonical directories,
  migrate legacy IDs to short hex IDs, normalize filenames, repair duplicate
  sequence prefixes, rewrite repository text references, refresh data
  `.gitignore` patterns for scoped `.generated/` directories, and rebuild views.
- Disposable metadata indexes live beside each entity folder
  (`.taskset/tasks/.generated/`, `.taskset/stories/.generated/`, and the other
  document-kind folders), not under a global `.taskset/generated/`.
-   New task and document IDs are immutable 5-6 character lowercase hex values
  such as `a1b2c3`. Filenames use `{sequence}-{slug}-{id}.md`. Agents MUST use
  the short `id` in commands, frontmatter relationships, and JSON
  handoffs—never the mutable filename sequence prefix alone. When linking to
  the file in Markdown prose, use the full repository-relative filepath so the
  link is clickable. Use `sync` or `task migrate-ids` for legacy repositories;
  do not rename entity files by hand because canonical relationships must be
  rewritten together.
- When a task change affects repository behavior, follow up with the relevant tests, docs, and `git diff --check`.

## Task Modeling

- Represent distinct deliverables as separate Taskset tasks instead of placing an entire plan in one raw-text task. Keep one task when the work is genuinely atomic or the items are only completion steps for the same outcome.
- Search existing open and recently completed tasks before creating new ones. Update or relate matching work instead of creating a duplicate; use `--duplicate` only when preserving a separately created duplicate is necessary.
- When a prompt contains many tasks, do not preserve its ordering blindly. Infer the work graph from the requested outcomes and repository context, then assign the appropriate existing labels and projects and record relationships such as `--depends-on`, `--related`, and `--parent`. A task that cannot start until another finishes must depend on that task; prompt order alone does not establish a dependency.
- Use `--depends-on` only for a real execution prerequisite and `--related` for useful context without blocking. Avoid dependency cycles and create prerequisites first when their generated IDs are needed by downstream tasks.
- Inspect existing tasks, labels, projects, and repository conventions before assigning metadata. Reuse established taxonomy and avoid inventing labels, projects, or relationships without supporting context.
- Resolve the active repository's Git identity with `git config --get user.name`. Use that current Git user as the default `--owner` for new tasks unless the prompt or established repository ownership identifies a more appropriate accountable owner. If no usable identity exists, do not invent one.
- Choose ownership and assignment deliberately: `owner` is the single person accountable for the outcome, while repeatable `--assignee` values identify the people expected to execute the work. Assign the current Git user when they are both accountable and executing; preserve a different explicit owner, and do not assign collaborators merely because they own related code or reviewed prior work.
- Re-evaluate owner and assignees when splitting tasks, creating child or follow-up work, or crossing team and package boundaries. Each independently tracked task may need different accountability; preserve existing assignments during unrelated updates.
- Attach known repository scope with `--file` or `--directory` so impact queries can find the task. Use the narrowest accurate paths and do not guess paths that have not been established.
- Model smaller steps within one task as Markdown checklist items beginning with `- [ ]` in the task body; those checklist items are subtasks for progress tracking. Use child tasks with `--parent` instead when a subtask needs its own status, ownership, dependencies, or tracking history.
- While working, when new deliverables, prerequisites, blockers, deferred scope, regressions, or verification gaps surface, create follow-up tasks, `--parent` child tasks, or checklist subtasks immediately. Relate Taskset tasks with `--depends-on`, `--related`, or `--parent` as appropriate. Do not finish or abandon the current task without recording that discovered work in Taskset.
- Update the active task's status and every subtask during execution, not only at the end. Set a Taskset task or child task to `doing` when starting it, check off checklist items as `- [x]` when finished, reflect blockers or pauses promptly, and mark each finished child task `done` before moving on. Close the parent only after its own acceptance criteria are met and every tracked subtask—checklist item or child task—is completed or otherwise intentionally resolved.
- When the repo or session has a primary skill (or a small set of them), prefer updating that skill after work that establishes lasting guidance: which tool or command to use, how a class of bugs was fixed, what repeatedly failed and how to avoid it, or an architecture decision that later tasks must honor. Keep the skill change minimal and decision-oriented; do not dump raw task notes into the skill.
- Give each task an outcome-oriented title and enough structured Markdown to make it executable: context or outcome, in-scope work, checklist when useful, observable acceptance criteria, and references. Avoid vague titles and undifferentiated text dumps.
- Preserve links, external URLs, named libraries, and other external mentions from the user's prompt in a `References` section in the relevant task body. Keep enough surrounding description to explain why each reference matters.
- Preserve user-supplied metadata when updating a task unless the requested change supersedes it. Keep the body, checklist state, status, dependencies, and scope consistent; do not mark a task done until its acceptance criteria are satisfied.
- For batch mutations, capture the IDs returned by each successful command and reconcile the current task list after any failure. Resume from the observed state instead of rerunning the whole batch and creating duplicates.
- Prefer closing completed or superseded work through status and relationships so history remains available. Delete a task only when removal is explicitly intended, after checking tasks that depend on it.
- If the prompt is ambiguous about scope or sequencing, record only relationships supported by evidence. Do not turn a guess into a dependency, owner, due date, estimate, or completion claim.
- After creating or changing several tasks, inspect them as a set and verify that identifiers, dependencies, parent-child links, related work, labels, projects, and checklist placement match the inferred work graph.
- During that set-level review, also verify that every task has the intended owner and only evidence-backed assignees.

For multi-task prompts or uncertainty about task granularity and relationships, read [good and bad task-modeling examples](references/task-modeling-examples.md).

## Document Modeling

- Prefer the document kinds that already exist. Do not invent notes, specs,
  epics, or RFCs as new kinds: investigation is `research`, lasting choices are
  `decision`, product context is `story` or `flow`, recovery procedures are
  `runbook`, recurring mistakes are `lesson`, residual risks are `concern`, and
  spot-check inventories are `audit`. Keep short scratch in the task body.
- Search existing documents before creating new ones. Update or `--related` a
  matching document instead of duplicating it.
- Create documents mid-work as soon as the evidence, decision, procedure,
  lesson, or risk is clear enough to reuse. Link both sides with `--related` to
  the originating task when practical.
- Status habits: start research, stories, and audits as `draft`; move them to
  `ready` or `accepted` when they stabilize; record decided ADRs as `accepted`
  (the create default); keep usable runbooks, lessons, and open concerns
  `active`; move mitigated concerns to `accepted` and obsolete lessons to
  `superseded` or `archived`.
- Attach owner, assignees, labels, projects, files, and directories when they help
  discovery the same way they do on tasks. Use `--depends-on` and `--parent`
  only for real document-to-document prerequisites within Taskset documents.
- Do not dump raw research into a primary skill. Capture the evidence in a
  research document, the choice in a decision document, the recurring pattern in
  a lesson, and only the lasting how-to in the skill.

For paired good and bad examples, read [document-modeling examples](references/document-modeling-examples.md).

## Monorepo Reasoning

When workspace configuration declares multiple apps or packages:

- Inspect the workspace manifest, relevant package manifests, package dependency graph, root and package-level task-runner configuration, and release configuration before decomposing work. Use declared package names and existing Taskset projects rather than inferring identity from directory names alone.
- Distinguish the workspace dependency graph, build-task graph, and Taskset work graph. A package dependency indicates possible impact but is not automatically a Taskset `--depends-on`; record a task dependency only when that concrete deliverable requires another task's output.
- Trace changes in shared packages outward to direct and transitive consumers. Include compatibility work and consumer validation in the originating task's scope, or create dependent tasks when those outcomes need separate ownership, status, release notes, or delivery.
- Split work by independently deliverable outcome, not mechanically by package. Keep one cross-package task when several package edits form one atomic capability; split it when packages can ship independently or require different owners, sequencing, acceptance criteria, or release treatment.
- Assign every affected workspace through existing `--project` values and attach the narrowest accurate `--file` or `--directory` scopes. Include root configuration only when the task actually changes repository-wide behavior.
- Put package-local implementation and scripts in the owning package. When a task runner such as Turborepo is present, describe task-pipeline or root configuration changes only when orchestration must change; do not compensate for undeclared workspace dependencies with ad hoc execution ordering.
- Make validation follow the impact graph: test the changed package, affected dependents, relevant integration boundaries, and any repository-wide configuration touched. Prefer the repository task runner's package filters or affected mode and record the intended commands or observable checks in acceptance criteria.
- Treat lockfiles, generated artifacts, workspace registration, exports, documentation, and Changesets as supporting parts of the owning outcome unless they are independently assignable deliverables. Do not create noisy standalone tasks for mechanical byproducts.
- Re-evaluate projects, file scopes, dependencies, validation, and Changesets whenever implementation crosses an unexpected package boundary. Record newly independent work as linked Taskset tasks before completing the current task.

For package-graph decomposition, cross-package validation, and new-package examples, read [monorepo task-modeling examples](references/monorepo-task-modeling.md).

## Changesets in Monorepos

When the repository contains `.changeset/config.json`:

- Inspect the Changesets config and affected package manifests before modeling release impact. Follow repository policy for ignored packages, linked or fixed groups, internal dependency bumps, and the base branch.
- Every task that may change a releasable package must include a `Changeset` section in its body. State either the expected package names, SemVer bump levels, and release-note intent, or `Not required` with a concrete reason supported by repository convention.
- Treat the changeset as part of the implementation task's checklist and acceptance criteria unless authoring or coordinating releases is itself a separately owned deliverable. Do not create a detached bookkeeping task for every changeset.
- Base bump levels on externally observable package impact, not task size. Include every directly affected package and account for any internal-dependent bumps required by the repository config.
- Prefer one changeset for one coherent user-facing change, even when it spans multiple packages. Use separate changesets when the changes have independent release-note meaning or may ship separately.
- While executing, update the task's Changeset section if the affected packages or release impact changes. Before marking the task done, create the required changeset, verify its package names, bump levels, and summary, and run the repository's Changesets status or validation command.
- Do not invent a release note for work that repository policy excludes, such as non-published examples or test-only changes. Record the no-changeset rationale so omission is deliberate and reviewable.

For paired examples of required, multi-package, and unnecessary changesets, read [Changesets task examples](references/changesets-examples.md).

## Agent Checklist

- Read the task and the surrounding repository context first.
- Before mutating or executing a task, compare its owner and assignees with the current Git user and obtain confirmation when another person is responsible.
- While executing, create follow-up tasks, child tasks, or checklist subtasks for every distinct piece of newly discovered work before moving on or closing the current task.
- While executing, create research, decision, runbook, story, flow, lesson, concern, or audit documents for reusable evidence, lasting choices, procedures, product context, recurring patterns, or residual risks; link them with `--related`.
- Keep parent status and every subtask current mid-work: check off finished checklist items, mark finished child tasks `done`, and only then close the parent. Use `taskset task program <parent-id> --json` for multi-task program health.
- When lasting lessons emerge, create a `lesson` and update any primary or `--related-skill` skill so future sessions avoid the same tool-choice, bug-fix, repeated-failure, or architecture mistake.
- In monorepos, verify affected packages and consumers against the workspace and task-runner graphs rather than relying only on the initially named directory.
- In repositories using Changesets, reconcile the task's declared Changeset requirement with the actual affected packages before completion.
- Prefer the smallest Taskset command that proves the intended state.
- Use short hex `id` values (`a1b2c3`) with `task show`, `task update`,
  `--related`, `--depends-on`, and `--parent`. Filename sequence prefixes are
  display metadata only—never identity and never Markdown link targets.
- When writing a Markdown hyperlink to a Taskset entity, doc, or skill file,
  use the repository-relative filepath (for example
  `.taskset/lessons/0000001-…-a1b2c3.md` or `docs/memory-model.md`). Inline
  mentions may still show the short `id` for humans and CLI copy-paste.
- Avoid editing generated output, caches, or any non-canonical `.taskset/` artifacts.
- Report validation failures plainly and only claim success after the command has run.
