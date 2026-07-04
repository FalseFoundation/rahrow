# Vitest And Test Strategy

Vitest workflow and RahRow-specific test coverage strategy.

## Vitest and Test-Driven Development

Vitest is the default runner for TypeScript domain, filesystem, CLI adapter, and
integration tests. Use the root `vitest.config.ts` until a package needs a
distinct runtime such as browser mode. Add Vitest `projects` only when separate
Node, browser, or extension environments provide real value.
Vitest already uses Vite internally. Do not add a standalone Vite build to
Node-focused libraries or the CLI unless a concrete bundling requirement
appears; use the owning UI application's build tool for browser products.

Compile Node libraries and the CLI to `dist/` and keep the runtime `import`
export pointed at emitted JavaScript. Source exports may serve types and
development tooling, but source-only runtime exports are not a substitute for
verifying executable build artifacts.

Use this loop for domain behavior and bug fixes:

1. Write or update the smallest failing test that describes observable
   behavior.
2. Implement the minimum coherent behavior.
3. Refactor with tests green.
4. Add boundary and failure cases proportional to risk.
5. Run the owning suite, then broader repository checks.

TDD is a feedback technique, not a coverage quota. Avoid testing private helper
shape, reproducing the implementation in mocks, or creating snapshots that
hide meaningful behavioral assertions.

Vitest snapshots are acceptable for stable serialized output, diagnostics, and
small renderer fragments when review remains readable. They are unrelated to
RahRow repository safety snapshots.

## RahRow Test Strategy

### Types and schema

- valid and invalid enum values
- required and optional fields
- defaults and versionless task reads/writes
- forward and backward compatibility fixtures

### Parsing and serialization

- YAML frontmatter and Markdown body separation
- deterministic key ordering and final newlines
- parse/serialize round-trip stability
- Unicode and CRLF input
- unknown, malformed, and duplicate fields
- preservation of human-authored Markdown

### Storage and CRUD

- repository discovery
- create, read, update, move, and delete
- atomic replacement and cleanup after failure
- duplicate IDs and filename collisions
- path traversal and symlink boundaries
- explicit timestamps through a test clock
- restore previews and atomic apply

### Graph and search

- missing references and cycles
- canonical versus derived relationships
- stable traversal and query ordering
- project, package, file, and directory matching
- monorepo impact analysis fixtures

### Interfaces

- CLI exit codes, stdout, stderr, and structured output
- MCP tool schemas and error mapping
- TUI keyboard behavior
- extension lifecycle and repository switching
- Kanban and Office loading, stale, conflict, and failure states

Prefer realistic fixture repositories over mocks for filesystem and Git
behavior. Keep unit-level domain logic pure where possible.
