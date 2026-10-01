# Task Modeling Examples

Use these examples to choose task boundaries and metadata. The IDs in commands are placeholders for IDs returned by Taskset.

## Split Independent Deliverables

Bad: one task titled `Do auth, docs, dashboard, and tests` with the entire prompt copied into its body. It hides ownership, progress, and sequencing.

Good: create separate tasks for the API, dashboard, and documentation when each produces a distinct outcome. Attach their relevant project and labels, and connect only genuine prerequisites.

```bash
pnpm taskset task create --title "Expose session-expiry API" --project api --label auth
pnpm taskset task create --title "Show expired sessions in the dashboard" --project web --label auth --depends-on <api-task-id>
pnpm taskset task create --title "Document session-expiry behavior" --project docs --related <api-task-id>
```

The dashboard is blocked by the API contract, so it depends on the API task. Documentation is related but need not be blocked if it can be drafted from the agreed contract.

## Do Not Treat Prompt Order as Execution Order

Prompt: “Update the UI, define the migration, then add the backend field.”

Bad: make the migration depend on the UI because the UI appeared first.

Good: infer that the schema/migration and backend field are prerequisites for the UI when repository evidence supports that flow. Create prerequisite tasks first, then use their returned IDs in `--depends-on` for downstream work. If the UI can use a stable mocked contract, relate the tasks instead of inventing a blocker.

## Checklist or Child Task

Both forms are subtasks. Prefer checklist items for steps that share one outcome; use Taskset child tasks when a step needs independent tracking.

Bad: create separately tracked tasks for tiny steps that share one outcome:

- Rename the function.
- Update one import.
- Run the focused test.

Good: keep them as checklist items in the body of one outcome-oriented task:

```markdown
Rename the parser entrypoint without changing its public behavior.

## Checklist

- [ ] Rename the function and its imports
- [ ] Update focused tests
- [ ] Run the parser test suite

## Acceptance criteria

- The old symbol has no remaining callers.
- Parser tests pass without behavior changes.
```

Use a child task with `--parent <parent-task-id>` instead if a step needs independent assignment, status, acceptance criteria, dependencies, or history.

## Create Follow-Ups While Executing

Bad: while fixing a parser bug, discover a missing migration and a docs gap, finish the parser fix, and leave those findings only in the chat transcript.

Good: create Taskset follow-ups as soon as the work is clear. Use a child task when the new work belongs under the current outcome; create a sibling or related task when it is a distinct deliverable.

```bash
pnpm taskset task create --title "Add migration for parser id format" --parent <parser-task-id> --depends-on <parser-task-id>
pnpm taskset task create --title "Document parser id format change" --project docs --related <parser-task-id>
```

Do not close or abandon the current task without recording discovered follow-up work in Taskset.

## Keep Status Current Through Execution

In this skill, "subtask" covers both Taskset child tasks and Markdown checklist items in a parent task body.

Bad: start implementation, finish three child tasks and several checklist steps, and leave the parent stuck in `todo` or `doing` with unchecked `- [ ]` items until a final cleanup pass—or mark the parent `done` while children or checklist items are still open.

Good: update progress as work proceeds.

```bash
pnpm taskset task update <parent-task-id> --status doing
pnpm taskset task update <child-task-id> --status doing
# ... complete that child task's acceptance criteria ...
pnpm taskset task status <child-task-id> done
```

For checklist subtasks, flip completed items from `- [ ]` to `- [x]` in the parent body as soon as each step finishes. After every tracked subtask is complete (children `done`, checklist items checked) and the parent criteria pass:

```bash
pnpm taskset task status <parent-task-id> done
```

Every completed subtask must be marked finished—child tasks via `done`, checklist items via `- [x]`. Update statuses and checklist state mid-work when progress or blockers change; do not wait until the session ends.

## Capture Lasting Lessons in the Primary Skill

Bad: after three failed attempts, discover that Biome must run before the focused package test, close the task with that note in its body, and leave the session's primary skill unchanged so the next agent repeats the same failure.

Good: when the repository or session treats a skill as primary, fold the durable rule into that skill (or its references) as a short decision rule—for example preferred tool selection, a known failure mode and its fix, or an architecture constraint. Keep task-specific history in the task; keep reusable guidance in the skill.

Update the primary skill for lessons that future work should consider: tool or command choice, bug-fix patterns, repeated failures, and architecture decisions. Skip skill edits for one-off, task-local details that will not help later sessions.

## Dependencies Versus Related Work

Bad: connect every task about authentication with `--depends-on`. Shared subject matter is not a blocker and can create false chains or cycles.

Good:

- Use `--depends-on <task-id>` when this task cannot begin or complete until that task delivers an input.
- Use `--related <task-id>` when tasks share context but can progress independently.
- Use `--parent <task-id>` for decomposition, not execution order. Add `--depends-on` separately if a child is genuinely blocked.

## References Belong in the Relevant Body

Prompt: “Adopt Zod 4 for request validation; follow https://zod.dev/v4.”

Bad:

```markdown
Upgrade validation.
```

Good:

```markdown
Adopt Zod 4 for request validation while preserving current error responses.

## Acceptance criteria

- Request schemas use the supported Zod 4 APIs.
- Existing error-response contract tests pass.

## References

- [Zod 4 documentation](https://zod.dev/v4) — migration and API reference supplied by the user.
```

Copy the reference only into tasks where it informs the work, and retain the user's stated reason or constraint rather than saving a bare URL.

## Update Without Clobbering Context

Bad: replace an existing body merely to change status, losing checked items, acceptance criteria, and references; or mark the task done because code was written even though validation remains unchecked.

Good: inspect the current task, apply the smallest update, preserve unrelated metadata, and reconcile the body with reality. Check completed checklist items, keep unfinished ones open, update relationships if scope changed, and set `done` only after the acceptance criteria are met.

## Avoid Duplicate Work

Bad: create `Add retry handling` without checking whether an active retry task already exists.

Good: search current and recent tasks first. If the same outcome exists, update that task. If the new work is distinct but adjacent, create it and use `--related`. If a duplicate was already created and must remain for history, mark the duplicate relationship with `--duplicate` according to repository convention.

## Record Repository Scope

Bad: label a task `core` but omit the known paths, making file-impact searches unable to connect it to the affected code.

Good: attach the narrowest established scope:

```bash
pnpm taskset task create --title "Validate task dependency cycles" --project core --file packages/core/src/graph/taskGraph.ts
```

Use `--directory` when the outcome genuinely spans a directory. Do not attach broad directories merely because the exact implementation is not yet known.

## Recover From a Partial Batch

Bad: five creates were requested, the third command failed, and the agent reruns all five commands. The first two tasks now exist twice.

Good: retain the IDs and JSON output from successful creates, list the current tasks after the failure, then create or update only the missing work. Rebuild downstream `--depends-on`, `--related`, and `--parent` arguments from verified IDs rather than assumed command positions.

## Close Rather Than Erase History

Bad: delete a completed task to clean up the active list, or use `--remove-dependencies` without inspecting downstream tasks.

Good: mark work `done` when its acceptance criteria pass. If work is superseded or duplicated, preserve the task and express that relationship according to repository convention. Delete only when removal itself is intended and its dependency impact has been inspected.

## Owner and Assignees

Bad: omit ownership from every generated task, assign every task to every contributor mentioned in the prompt, or overwrite an explicitly assigned owner with the local Git identity.

Good: first resolve the repository's current Git user:

```bash
git config --get user.name
```

Use that value as the default owner when creating a task. If it returns `Alex Chen` and Alex will also implement the work:

```bash
pnpm taskset task create --title "Validate task dependency cycles" --owner "Alex Chen" --assignee "Alex Chen"
```

If the prompt explicitly makes Sam accountable while Alex implements it, preserve that distinction:

```bash
pnpm taskset task create --title "Validate task dependency cycles" --owner "Sam Rivera" --assignee "Alex Chen"
```

Use multiple `--assignee` options only when each named person is genuinely expected to execute part of the task. Code ownership, package maintainership, or prior review can inform investigation, but does not by itself authorize assigning a person.

When a cross-package plan is split, choose owner and assignees per resulting task rather than copying the parent task's people blindly. Do not change existing ownership while updating unrelated metadata.

## Pre-Execution Ownership Check

Current Git user: `Alex Chen`.

### Current User Is Assigned

Task metadata:

```yaml
owner: Sam Rivera
assignees:
  - Alex Chen
```

Good: Alex may execute the task because Alex is an explicit assignee. Keep Sam as owner unless the user requests an accountability change.

Bad: stop merely because owner and assignee differ, or replace Sam with Alex automatically.

### Task Belongs to Someone Else

Task metadata:

```yaml
owner: Sam Rivera
assignees:
  - Priya Shah
```

Prompt: “Work on the next open task.”

Good: inspect and report the task, then ask whether Alex should proceed or take it over before changing status, assignment, task contents, or repository code.

Bad: treat the generic prompt as permission, set the task to `doing`, add Alex as an assignee, or start implementation without surfacing the ownership conflict.

### Specific Execution Is Explicitly Authorized

Task metadata still names Sam and Priya, but the user says: “Alex, implement `TS-...` now; do not reassign it.”

Good: this explicitly authorizes execution of the identified task. Proceed while preserving its owner and assignees as directed.

Bad: ask the same execution question again, or interpret authorization to execute as authorization to replace the owner.

### Takeover Includes Assignment Change

The user says: “Take over `TS-...` and assign it to the current Git user.”

Good: preserve the existing owner unless the user also requests an owner change, add or replace assignees according to the explicit instruction and repository convention, then begin work.

Bad: silently transfer ownership as well, or retain an assignee list that no longer represents who is expected to perform the task.

Read-only task inspection is allowed in every scenario above. The confirmation gate applies before mutations or execution, and it does not bypass unresolved dependencies or explicit blockers.
