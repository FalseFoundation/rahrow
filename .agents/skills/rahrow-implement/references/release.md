# Release and Completion

## Changesets

The public runtime package set is currently:

```text
@rahrow/core
```

`@rahrow/engine`, apps, and tooling remain private until their release
contracts are deliberately defined. Future CLI work may introduce `@rahrow/cli`
as a public package, but it is not part of the active workspace yet.

`.github/workflows/publish-npm.yml` runs repository validation and then uses
`pnpm --recursive publish --access public --no-git-checks` when a GitHub Release
is published. pnpm skips private workspaces and publishes the public dependency
chain. The workflow requires the `NPM_TOKEN` repository secret and enables npm
provenance through GitHub's OIDC permission.

The npm account used by CI must control the `@rahrow` scope.

Once configured, create a Changeset when a versioned package's behavior,
contract, build, persisted format, or user-visible tooling changes:

```bash
pnpm changeset
```

Select the exact current manifest names for changed public packages:

```text
@rahrow/core
```

Do not add Changesets for private packages or select a duplicate or misplaced
scaffold name. Correct package identity first.

Choose the bump by impact:

- `patch`: compatible fix or internal correction
- `minor`: compatible feature, command, field, tool, or public behavior
- `major`: breaking API, package identity, command contract, persisted schema,
  migration requirement, or workflow change

Persisted Markdown compatibility is a public contract. A parser change that
makes existing repositories unreadable is breaking.

Write summaries for users:

- lead with behavior
- state compatibility and migration consequences
- avoid raw file lists and implementation diaries

Do not create a Changeset for:

- `skills/` instructions
- tests-only changes
- internal documentation corrections
- formatting-only changes
- repository notes that do not alter supported behavior

Use these only during explicit release work:

```bash
pnpm changeset status
pnpm changeset version
```

Do not manually edit package versions or generated changelogs during ordinary
feature work.

## Commit Language

Prefer concise conventional subjects:

```text
feat(core): add deterministic task parsing
fix(cli): report malformed frontmatter
refactor(types): unify relationship contracts
chore(tooling): align workspace package names
docs(standards): migrate repository guidance to RahRow
```

Use an imperative, behavior-focused subject. Add a body when architecture,
compatibility, migration, or verification needs explanation.

## Compatibility Review

Review these surfaces before release:

- Markdown and frontmatter read compatibility
- schema defaults, enums, and validation strictness
- generated filenames and entity IDs
- CLI command names, flags, output, and exit codes
- package exports and runtime requirements
- configuration file names and defaults
- relationship and graph semantics
- snapshot creation and restore semantics
- documentation routes and public examples

Do not call a change internal merely because only one current interface uses it.
If it affects canonical repository data, it affects every future interface.

## Definition of Done

A change is complete when:

- the requested outcome is correct, not merely implemented literally
- canonical local profile/settings data remains the persistent authority
- all affected schemas, core operations, clients, tests, and docs agree
- no interface-specific duplicate of domain behavior was introduced
- package names, exports, and dependencies match ownership
- user-owned worktree changes remain intact
- focused tests cover new or corrected behavior
- broader checks match the blast radius
- persisted format changes include compatibility and migration handling
- generated outputs were regenerated rather than hand-edited
- a Changeset exists when release policy requires one
- documentation uses current paths, commands, and package names
- `skills/standards/` was updated when repository rules or workflows changed
- the final report distinguishes passed checks, skipped checks, prerequisites,
  and pre-existing failures
