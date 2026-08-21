---
name: rahrow-implement
description: Repository-specific engineering standards for RahRow. Use when planning, implementing, reviewing, testing, documenting, releasing, or restructuring this repository, especially for package ownership, cross-platform V2Ray client architecture, engine adapters, pnpm and Turbo workflows, TypeScript conventions, tests, and Changesets.
---

# RahRow Implementation Standards

Apply these standards to every RahRow repository task. Treat them as decision
rules, not as a substitute for reading the code involved.

## Skill Resources

Load only the references relevant to the task. The top-level reference files
are routing maps; after reading the relevant map, load only the topic files it
names for the work in front of you:

- [architecture.md](references/architecture.md): route to product/source,
  ownership/dependency, client/core, storage/snapshot, documentation, and
  generated-source architecture references
- [conventions.md](references/conventions.md): route to design, naming,
  TypeScript, runtime entities, interface/UI, native/tooling, test, and
  documentation convention references
- [workflows.md](references/workflows.md): route to environment, pnpm, Turbo,
  dependency, docs-site, validation, Vitest, persisted-data, and Git workflow
  references
- [release.md](references/release.md): Changesets, compatibility, commit
  language, and completion requirements
- [`docs/maintainers/technology.md`](../../docs/maintainers/technology.md): preferred
  TanStack frontend tools, native-code limits, and local persistence defaults

If a referenced skill file does not exist, report the missing file, state which
decisions cannot be made without it, and continue only with rules defined in
this skill; do not infer conventions from absence.

`agents/openai.yaml` is discovery and UI metadata. Do not load it as an
instruction reference.

## Start With Judgment

1. Read the complete request before planning or acting. For a multi-part
   request, identify dependencies, contradictions, and shared owners across all
   items before changing any one item.
2. Turn multi-part work into a prioritized checklist. Close every requested
   item as implemented, already satisfied, or intentionally unnecessary with a
   concrete reason; do not silently drop notes or late dependencies.
3. Parse the request into intent, constraints, affected owners, and a concrete
   completion condition.
4. Inspect the worktree, manifests, relevant implementation, tests, and
   executable configuration before proposing or editing.
5. Challenge an approach that creates a second source of truth, bypasses core
   validation, weakens deterministic file behavior, or crosses package
   ownership without a contract.
6. If a requested change appears unreasonable, internally contradictory,
  destructive, or incompatible with established product contracts, explain
  the concrete concern and ask for explicit confirmation before implementing
  it. If the request still does not yield a concrete completion condition,
  ask one focused question about the single most consequential missing piece
  before implementing anything.
7. Recover decisions from the repository before asking questions. Ask only when
   a consequential product or data-format decision remains unresolved.
8. Treat related work as one dependency graph. Keep schemas, core behavior,
   clients, tests, docs, and release metadata consistent.
9. Update this skill and its relevant references in the same change whenever
   authoritative paths, package names, commands, architecture, product
   contracts, documentation workflows, or completion rules change. Never leave
   the skill knowingly stale.

Do not implement a request merely because it was requested. Establish that the
outcome is coherent with RahRow's platform architecture and product contract first.

## Establish Authority

When repository sources disagree, use this order:

1. Current user constraints and the actual task.
2. Executable manifests and tooling: `package.json`, `pnpm-workspace.yaml`,
   `turbo.json`, `tsconfig.json`, and `biome.json`.
3. Current implementation and tests.
4. Current first-party documentation and this skill.
5. Product plans and historical notes for intent only.

If current user constraints conflict with a non-negotiable product invariant
listed in Preserve Product Invariants, the invariant takes precedence. Explain
the conflict to the user and request an explicit override with rationale before
proceeding.

The repository is currently an early scaffold. Do not turn accidental manifest
mistakes, empty packages, or placeholder dependencies into conventions. Report
them and follow the intended `@rahrow/<directory-name>` ownership model.

## Preserve Product Invariants

Read [architecture.md](references/architecture.md), then the topic-relevant
architecture topic file, before changing package boundaries, entity formats,
filesystem behavior, graph semantics, or interface contracts.

Non-negotiable rules:

- RahRow is a cross-platform, privacy-first V2Ray client platform.
- `@rahrow/core` owns shared domain schemas and TypeScript contracts.
- Shared domain behavior belongs in owned packages, not duplicated across apps.
- `@rahrow/engine` owns proxy engine implementations behind core contracts.
- Interface layers own presentation, transport, and platform UX concerns.
- External integrations and generated outputs do not become silent sources of truth.
- Persisted format and schema changes require explicit compatibility and migration decisions.
- Package boundaries must remain explicit and enforced through manifest dependencies.

## Organize by Ownership

Use the architecture appropriate to the owning surface:

- Use feature-based architecture for UI and interface packages such as desktop,
  mobile, and future CLI.
- Use a small DDD-style modular monolith for `@rahrow/core`. Organize by domain
  module first, then separate domain,
  application, and infrastructure layers within a module only when each layer
  contains at least one type, function, or class that is not a direct
  delegation to another layer and that has independent test coverage.
- Keep domain modules in one deployable codebase until independent deployment
  is justified. Do not introduce microservices, message brokers, or distributed
  persistence for organizational aesthetics.
- Colocate feature or module behavior, adapters, tests, and fixtures.
- Keep a `README.md` in every package and app that states its ownership and
  current contents.
- Keep public usage guidance in `README.md` and `docs/`; keep repository
  architecture and engineering guidance in `docs/maintainers/`.
- Keep canonical website blog posts in `apps/www/posts/`; do not duplicate them
  in `docs/`.
- Promote code to a shared package only when two or more distinct packages
  require the same logic and that logic has a defined, versioned interface that
  is not expected to change with each consuming feature's evolution.
- Keep client-specific state and presentation in the client. Keep shared domain
  rules in shared domain packages.

Read [conventions.md](references/conventions.md), then the topic-relevant
conventions topic file, before adding or renaming source files, packages,
exports, public types, entity fields, commands, or scripts.

## Execute Safely

1. [always] Before editing:
   - Run `git status --short --branch`.
   - Identify user-owned changes and work with them.
   - Search for existing contracts, helpers, schemas, commands, and tests.
   - Determine whether each target is owned source, canonical RahRow data,
     generated output, or cache.
   - Read [workflows.md](references/workflows.md), then the task-relevant
     workflow topic file, for current commands and validation.
2. [always] While editing:
   - Keep changes in the owning layer and update required dependents.
   - Use `workspace:*` for internal dependencies.
   - Declare each imported dependency in the importing package manifest.
   - Consume workspace code through package exports, never sibling `src/`
     paths.
   - Do not use TypeScript `paths` to bypass package boundaries.
   - Do not hand-edit generated output or caches.
   - Use structured YAML and Markdown parsers for entity files.
   - Keep serialization deterministic and filesystem writes failure-safe.
   - Prefer test-first work for domain rules, bug fixes, parsers, migrations,
     and lifecycle transitions. During exploratory spikes, defer tests until
     the approach stabilizes, then add the minimum focused tests before the
     change is complete.
   - Add the minimum number of focused tests that assert the specified behavior
     and cover task-specific edge cases such as malformed input, boundary
     values, and failure paths where applicable. Do not add tests for
     implementation details or untested assumptions.
3. [always] Verify by risk:
   - Run the narrowest useful check first, then broaden.
   - Focused unit or fixture test.
   - Owning package test and type/build check.
   - Root Biome check and relevant Turbo tasks.
   - Cross-package integration test.
   - CLI, engine, filesystem, or UI workflow test when behavior crosses those
     boundaries.
   - For persisted data behavior, include malformed input, round-trip
     stability, path normalization, graph integrity, and interrupted-write
     cases as relevant.
   - Never claim a check passed unless it ran successfully.
4. [always] Before completion:
   - Run `git diff --check` and review the scoped diff.
  - Confirm canonical product contracts remain the persistent authority.
   - Confirm package dependencies point inward toward contracts, utilities,
     and core, not sideways between clients.
   - Update `docs/` and this skill when the change alters product behavior,
     architecture, commands, persisted formats, or repository workflows.
   - Add a Changeset when release policy is configured and versioned behavior
     changed.
   - If release policy configuration is absent or ambiguous, report the gap
     and do not add a Changeset. If it is unclear whether a behavior change is
     versioned, default to adding a Changeset with a patch bump and note the
     uncertainty in the Changeset summary.
   - Do not add a Changeset for skill-only, test-only, formatting-only, or
     internal documentation changes.
   - Report behavior, affected boundaries, checks run, and pre-existing
     failures.

Read [release.md](references/release.md) for compatibility and definition of
done.
