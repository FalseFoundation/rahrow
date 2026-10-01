# Monorepo Task-Modeling Examples

Use these examples after inspecting the repository's actual workspace, package manifests, task runner, Taskset projects, and release configuration. Names and commands shown here are illustrative.

## Reason Across the Package Graph

Prompt: “Add a task risk value to the CLI.” The CLI consumes core APIs and shared contracts.

Bad: create one CLI-only task scoped to `packages/cli` without checking where the data type and persistence behavior live.

Good: trace the capability through the workspace graph and model the outcomes that actually need separate tracking:

```text
Define risk contract → persist/query risk in core → expose risk in CLI
```

- Scope the contract task to the contracts package.
- Make the core task depend on the contract task if it needs the finalized type.
- Make the CLI task depend on the core capability when it cannot be completed against an agreed interface or mock.
- Relate rather than block tasks that can proceed independently against a stable contract.
- Validate the changed packages and their consumers, not just the CLI directory named in the prompt.

Do not copy the package graph directly into Taskset. For example, the CLI package depending on contracts does not make every CLI task depend on every contracts task.

## Atomic Cross-Package Capability

Bad: create separate tasks for a two-line contract update, its core implementation, its CLI adapter, the lockfile, and the changeset even though one owner will deliver and review them together.

Good: use one task when all edits form one atomic user-facing capability:

```markdown
Expose task risk filters through the public contract, core query API, and CLI.

## Scope

- `@taskset/contracts`: define the filter field
- `@taskset/core`: apply the filter in task queries
- `@taskset/cli`: accept and serialize the option

## Checklist

- [ ] Update the shared contract
- [ ] Implement core filtering
- [ ] Expose the CLI option
- [ ] Validate affected packages and dependents
- [ ] Create and validate the changeset

## Acceptance criteria

- Contract, core, and CLI tests pass.
- Existing callers remain compatible.
- The changeset describes the coherent public capability and all releasable packages affected.
```

Attach every established Taskset project and narrow package directory involved. Do not create a standalone lockfile or changeset task for this outcome.

## When to Split Cross-Package Work

Bad: keep a migration, backend rollout, and independently deployed web adoption in one task even though they have different owners and the web work is blocked on rollout.

Good:

- Create a shared contract or migration task.
- Create an implementation/rollout task with the real prerequisite relationship.
- Create a consumer task that depends on rollout only if it cannot safely ship first.
- Give each task its own package scope, acceptance criteria, validation, and Changeset decision.

Package boundaries alone do not require splitting. Independent ownership, status, sequencing, deployment, or release meaning do.

## Shared Package Impact

Bad: modify a shared package and validate only that package because its local tests pass.

Good: identify direct and transitive consumers, then record focused plus downstream validation. In a Turborepo workspace, a task might include:

```bash
pnpm exec turbo run test --filter=...@taskset/contracts
pnpm exec turbo run build --filter=...@taskset/contracts
```

Choose filter direction from the intended check: dependencies of a package and dependents of a package are different sets. Use the repository's supported commands and verify filters before putting them into a task body. Use `--affected` when branch-diff semantics match the task and its configured base branch.

## Root Configuration Versus Package Work

Bad: put package-specific build logic in the root task merely because the repository is a monorepo, or add manual `cd package && build` chains to enforce ordering.

Good: keep scripts and implementation in the owning packages, declare workspace dependencies in package manifests, and let the task runner derive ordering. Scope a Taskset task to root files such as `turbo.json` or the workspace manifest only when orchestration, package discovery, shared inputs, or global policy truly changes.

For Turborepo, written scripts and CI should use `turbo run`; package dependencies must be declared for `^build` ordering to work.

## Add a New Workspace Package

Bad: create a task that says only “Add package” and consider it complete when a directory exists.

Good: include the relevant repository integration points:

```markdown
Add the publishable `@acme/events` workspace package.

## Checklist

- [ ] Create the package manifest and public exports
- [ ] Register or verify workspace discovery
- [ ] Declare internal dependencies through workspace protocols
- [ ] Add package-local build, test, and type-check scripts
- [ ] Verify task-runner pipeline participation and cache outputs
- [ ] Add focused tests and consumer integration coverage
- [ ] Document intended consumers and package boundaries
- [ ] Create and validate the required changeset

## Acceptance criteria

- The package is resolved by the workspace package manager.
- Its declared pipeline tasks run through the repository task runner.
- Consumers import public exports rather than package internals.
- Affected builds and tests pass.
```

Only include publishing and Changesets requirements when the package is releasable under repository policy.

## Unexpected Cross-Package Scope

Bad: begin an app-only task, discover that a shared package must change, silently expand the implementation, and leave the original task metadata, validation, and changeset plan untouched.

Good: reassess whether the shared change remains atomic. Update the current task's projects, paths, acceptance criteria, downstream validation, and Changeset section when it does. If it becomes an independently deliverable prerequisite or needs another owner, create a linked task and set the real dependency direction before proceeding.
