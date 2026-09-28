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
