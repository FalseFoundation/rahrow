# Document Modeling Examples

Use these examples to choose document kinds and when to create them mid-work.
IDs in commands are placeholders for IDs returned by Taskset.

## Research Versus Task Notes

Bad: while comparing queue providers, paste a long evidence dump into the task
body and leave the recommendation only in chat.

Good: create a research document, keep the task focused on the delivery outcome,
and link both.

```bash
taskset document create research --title "Evaluate queue providers" --related <task-id>
taskset task update <task-id> --related <research-id>
```

In Markdown prose, link the created file by filepath (for example
`.taskset/research/0000001-evaluate-queue-providers-<research-id>.md`), not by
a bare hex id as the link target.

## Decision Versus Research

Bad: write an ADR before evidence exists, or leave a chosen architecture only as
unchecked notes in a task checklist.

Good: capture investigation as `research` first when options are still open.
When the choice is made, create or update a `decision` (`adr`) with context,
alternatives, and consequences, then `--related` the research and the task.

```bash
pnpm taskset document create adr --title "Use transactional outbox" --related <task-id> --related <research-id>
```

## Runbook Versus Checklist

Bad: discover a recovery procedure during an incident-fix task and leave the
steps as a one-off checklist that disappears when the task closes.

Good: create a `runbook` with symptoms, checks, actions, rollback, and
verification, keep it `active`, and relate it to the task that produced it.

```bash
pnpm taskset document create runbook --title "Recover consumer lag" --related <task-id>
```

## Keep Scratch In The Task

Bad: create a research document for “rename helper and re-run tests”.

Good: keep tiny execution steps as checklist items on the task. Use documents
only when another person or future agent would reuse the material outside that
task’s completion.

## Story Or Flow Versus Implementation Task

Bad: model “Member signs in via SSO” only as an implementation task with no
acceptance context.

Good: keep the user outcome in a `story` or journey in a `flow`, then create
implementation tasks that `--related` that document and carry the code work.

```bash
pnpm taskset document create story --title "Member signs in via SSO"
pnpm taskset task create --title "Add SSO callback handler" --related <story-id> --file packages/api/src/auth.ts
```

## Lesson Versus Closed Task Note

Bad: rediscover “channel capability ≠ authz grant” in chat after the fixing task
is already `done`, or paste the pattern only into a skill with no Taskset trail.

Good: create a `lesson` with trigger, incorrect pattern, correct pattern,
severity, prevention, and evidence; relate the originating task/concern; and if
`--related-skill` is set, update that skill in the same change.

```bash
pnpm taskset document create lesson \
  --title "Capability flags are enablement only" \
  --severity high \
  --related-skill .agents/skills/security/SKILL.md \
  --related <task-id>
```

## Concern Versus ADR Or Runbook

Bad: leave residual authz risk as an unfinished checklist forever, or write an
ADR that only says “still risky” with no review cadence.

Good: create a `concern` for living open/residual risk (class, trust boundary,
evidence, residual risk, mitigation/acceptance, cadence). Use `decision` for the
chosen design and `runbook` for recovery steps.

```bash
pnpm taskset document create concern \
  --title "Telegram capability must not grant CASL" \
  --class authz \
  --cadence on-release \
  --related <task-id>
```

## Audit Versus Informal Research Dump

Bad: paste a route inventory into a research body with no findings status or
follow-ups.

Good: use `audit` for structured spot-checks with scope, method, findings
(`pass` | `fail` | `residual`), residual items, required follow-ups, and next
due date.

```bash
pnpm taskset document create audit --title "Public route inventory" --related <program-task-id>
```
