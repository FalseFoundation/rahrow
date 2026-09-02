# Large Migration Mandate

Use this reference when the user invokes `rahrow-implement` with a broad command such as:

```text
apply rahrow migrations and architecture and best practices over the current implemented packages/core package/engine and then apps/*
```

This is permission to perform a large, multi-phase implementation/refactor across the repository. Do not reduce it to a narrow cleanup unless the user explicitly scopes it down.

If the user names only `packages/core` and `packages/engine`, still reason globally. Those packages define contracts consumed by CLI, desktop, mobile, UI, storage, subscriptions, protocols, and tooling. A real pass may require touching consumers, exports, workspace structure, scripts, tests, docs, and Taskset/Changesets.

## Operating Mode

Treat the request as an architecture migration, not a code review.

- Load the architecture, migration, testing, workflow, and modularity references before making broad changes.
- Inspect the actual repository state before deciding what to keep, move, merge, delete, or rewrite.
- Produce an architecture audit before editing: current package responsibilities, dependency direction, duplicated logic, misplaced platform/engine/app code, missing boundaries, stale packages, and app consumers affected.
- Treat tests, types, schemas, and validation as support work. They do not complete the migration unless the structural boundary issues have also been addressed or explicitly found absent.
- Prefer codebase graph discovery when available; use file search for configs, scripts, package manifests, and non-code artifacts.
- Use Taskset for persistent planning when the work spans multiple phases or follow-up tasks.
- Use Changesets when package public APIs, exported behavior, or release-facing package contracts change.
- Use installed skills that match subareas: `turborepo` for package scripts/Turbo, `shadcn` for UI system work, `tdd` for test-first critical behavior, and React skills for frontend architecture.

## Minimum Bar

A large architecture pass is not complete until the agent has checked and either changed or explicitly ruled out changes for:

- package responsibilities and public exports
- dependency direction between apps, core, engine, UI, platform, storage, protocols, and subscriptions
- duplicated domain/protocol/engine/application logic across apps or packages
- platform-specific code leaking into core or shared domain packages
- engine-specific Xray configuration leaking into UI, apps, or core domain models
- feature/module file architecture in apps
- workspace scripts, Turbo tasks, and package manifests
- tests for behavior changed by the refactor
- docs, Taskset, and Changesets where the change affects planning or public package behavior

If the audit finds the architecture already correct, say so with concrete evidence. Otherwise, implement the structural changes; do not stop at local improvements.

## Execution Order

Default order for a full RahRow architecture pass:

1. Repository and task audit: inspect current task state, package graph, root scripts, Turbo config, workspaces, changed files, public exports, app imports, and boundary violations.
2. Architecture map: write down current responsibilities and target responsibilities for each touched package/app before editing.
3. `packages/core`: establish clean domain contracts, Zod validation, connection lifecycle, storage contracts, platform contracts, subscriptions contracts, public exports, and tests.
4. `packages/engine`: establish `ProxyEngine`, Xray adapter/config builder/process boundary, latency testing contract, public exports, runtime edge contracts, and tests that do not require a live Xray runtime.
5. Shared packages: normalize `@rahrow/ui`, tooling, static assets, protocols/subscriptions/storage packages if they already exist or are justified.
6. `apps/cli`: wire shared core/engine behavior without duplicating protocol or engine logic.
7. `apps/desktop`: wire React/Vite/Tauri around shared logic, keep Rust/native code minimal and edge-only.
8. `apps/mobile`: wire React/Vite/Capacitor around shared logic, keep native Android/iOS capabilities edge-only.
9. Scripts/tooling/docs: align package scripts, Turbo tasks, TypeScript config, Biome, Vitest, Taskset, Changesets, and root docs with current repo conventions.
10. Verification: run targeted tests during phases and finish with the strongest practical repo-level checks.

This order may be adjusted when dependency direction requires it, but do not start app rewrites by duplicating missing domain behavior inside apps.

## Refactor Size

Large changes are allowed when they simplify the architecture and align the repo with the plan.

Acceptable large changes:

- moving behavior from apps into `packages/core`, `packages/engine`, `packages/protocols`, `packages/subscriptions`, `packages/storage`, `packages/ui`, or a justified reusable frontend package
- moving code out of `packages/core` or `packages/engine` when it belongs to protocols, subscriptions, storage, platform, app features, or runtime adapters
- deleting obsolete framework/config/dependency remnants
- renaming files to match repository naming conventions
- replacing inheritance or class-heavy structures with composed contracts, registries, pipelines, and functions
- splitting mixed files into domain-owned modules
- changing app imports and package exports to match the new boundary
- adding tests around protocol, validation, subscription, engine config, lifecycle, and persistence behavior

Not acceptable:

- adding empty packages as architecture placeholders
- introducing new frameworks or services outside the plan
- moving all code into generic `shared`, `common`, `utils`, `modules`, or `services` directories
- preserving broken architecture just because it already exists
- stopping after a surface-level pass when deeper package/app coupling remains
- reporting success after only adding tests, schemas, ids, or injectable helpers when package/app responsibilities remain unexamined

## Planning Granularity

For broad work, maintain a visible phase checklist. A good phase is large enough to complete a meaningful boundary and small enough to verify.

Prefer this shape:

```text
Audit -> Architecture map -> Core -> Engine -> Shared packages -> CLI -> Desktop -> Mobile -> Tooling/docs -> Final verification
```

Within each phase:

- identify current behavior and public exports
- decide keep/move/merge/delete/rewrite
- inspect direct consumers before changing contracts
- make the minimum coherent architecture change
- update consumers so the architecture is actually applied
- add or update tests where behavior changes
- run targeted verification for that phase
- record follow-up tasks only for work that cannot be completed in the current pass

## Stopping Conditions

Do not stop merely because the change is large. Stop only when:

- the requested migration pass is complete
- a concrete technical blocker prevents meaningful progress
- required external approval is denied
- a verification failure points to an unrelated pre-existing issue that should be recorded instead of silently folded into the migration

Do not stop at the first green test run if the audit identified remaining architectural work in scope.

If blocked, report the exact blocker, affected phase, and next command or decision needed.

## Final Report Expectations

For a large migration, final output should include:

- phase summary
- architecture audit summary: what was wrong, what was already aligned, and what changed
- major architectural changes
- package/app areas touched
- consumer updates made across apps/packages
- tests/checks run and results
- known follow-ups or blocked items
- whether Changesets or Taskset entries were created/updated
