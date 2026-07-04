---
title: Testing
description: Maintainer test strategy, Vitest usage, and pragmatic TDD guidance.
---

# Testing

RahRow uses Vitest for TypeScript unit and integration tests. The root
configuration is shared by package-local suites. Turbo runs each owning
package's Vitest task and the root workspace architecture suite.
Vitest already provides the Vite-powered test pipeline; the Node library and
CLI packages use TypeScript directly for builds, so they do not need a separate
Vite build configuration.

```bash
pnpm test
pnpm test:architecture
pnpm test:watch
pnpm check
```

Use filtered package tests for focused work:

```bash
pnpm --filter @rahrow/core test
pnpm --filter @rahrow/cli test
```

Package-local test scripts are intentional. Turbo and filtered pnpm commands
execute scripts owned by each workspace; the root script cannot replace those
entrypoints. `test:architecture` names the separate root-only package-boundary
suite. There is no `transit` command in the repository.

## TDD Policy

Prefer a red-green-refactor loop for:

- domain invariants
- parser and serializer behavior
- lifecycle transitions
- graph rules
- migrations
- bug fixes

Do not force test-first ceremony for documentation, formatting, generated
configuration, or exploratory spikes. Convert a successful spike into tested
production behavior before merging it.

## Test Layers

### Unit

Test pure schemas, value objects, state transitions, graph algorithms, filters,
and serialization rules.

### Integration

Use temporary fixture repositories to test filesystem behavior, Git discovery,
atomic writes, path safety, monorepo discovery, and package impact.

### Contract

Verify CLI exit codes and output, MCP schemas, package exports, and persisted
Markdown compatibility.

### UI

Test feature behavior and accessibility in the owning interface. Add browser
projects only when UI packages exist.

### End to end

Keep a small number of workflows that create a fixture repository and exercise
the public CLI or hosted interface. Do not duplicate every unit case at this
level.

## Important Cases

- malformed YAML and unknown fields
- CRLF, Unicode, and empty Markdown bodies
- parse and serialize round trips
- duplicate IDs and branch-safe identity
- path traversal and symlink boundaries
- broken graph references and cycles
- interrupted writes and stale updates
- old-format fixtures and compatibility rollback behavior

Vitest code snapshots are acceptable for small stable serialized output or
diagnostics. They are unrelated to RahRow safety snapshots.
