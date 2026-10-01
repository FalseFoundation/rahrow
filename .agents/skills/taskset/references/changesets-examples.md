# Changesets Task Examples

Use these examples only when `.changeset/config.json` is present. Package names and bump levels must come from the target repository and the actual release impact.

## Releasable Package Change

Bad:

```markdown
Add cycle validation to the graph code.

- [ ] Implement it
- [ ] Add tests
```

The task does not say whether the published package changes or what must appear in release notes.

Good:

```markdown
Reject dependency cycles through the public task-graph validation API.

## Checklist

- [ ] Implement cycle validation
- [ ] Add public-behavior tests
- [ ] Create and validate the required changeset

## Acceptance criteria

- Cycles return the documented validation error.
- Existing acyclic graphs remain valid.
- Changesets status recognizes the new release entry.

## Changeset

- Required package: `@taskset/core`
- Expected bump: minor
- Release-note intent: dependency graphs now reject cycles through the public validation API
```

The final bump still needs to match the repository's SemVer policy. If the behavior is considered a correction to an already documented contract, the implementation may justify a patch instead.

## One Change Across Multiple Packages

Bad: add unrelated changesets mechanically—one per touched package—or mention only the package where most code changed.

Good:

```markdown
Expose dependency-cycle diagnostics through the core API and CLI.

## Changeset

- Required packages:
  - `@taskset/core` — minor
  - `@taskset/cli` — minor
- Release-note intent: users can detect and inspect dependency cycles from both the API and CLI
- Use one changeset because both package updates deliver one user-facing capability.
```

If repository config causes additional internal dependents to be bumped, verify those effects with Changesets rather than guessing them from workspace topology.

## No Changeset Required

Bad: omit any mention of a changeset, leaving reviewers unable to tell whether it was forgotten.

Good:

```markdown
Refactor dependency-cycle test fixtures without changing published behavior.

## Changeset

Not required — test-only refactoring with no change to a published package's runtime behavior, types, or documented contract.
```

“Not required” must be reconsidered if execution reveals a public behavior, type, dependency, or package metadata change.

## Keep the Task and Changeset in Sync

Bad: the task predicts a patch for one package, implementation expands into a new public API across two packages, and the original changeset plan remains unchanged.

Good: update the task body as scope becomes known, create the changeset for the packages actually affected, and validate it before completion. A useful completion sequence is:

```bash
pnpm exec changeset
pnpm exec changeset status --since=main
```

Use the repository's package-manager command and configured base branch rather than copying these commands blindly.

## Changeset Task or Checklist Item

Bad: create a separate “Add changeset” task for every implementation task, adding dependency noise without independent ownership or workflow.

Good: keep changeset creation in the implementation checklist. Create a separate Taskset task only when release-note authoring, coordinated versioning, or release preparation is independently assignable, blocked, or reviewed.
