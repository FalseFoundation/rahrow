# Product And Source

Product direction and the canonical source-of-truth model.

## Product Direction

RahRow began as an offline, inline, AI-friendly, human-readable task manager
designed to accelerate software delivery and give development teams immediate
awareness of the work surrounding their code.

It grows from that core into a Git-native software delivery platform. Tasks,
epics, specifications, architecture decisions, releases, runbooks, and project
knowledge live beside the code as human-readable Markdown.

Vision: become the Git-native operating system for software delivery.

Mission: let developers, AI systems, and stakeholders work through different
interfaces without creating a second source of truth outside the repository.

Design for:

- Markdown that remains useful without RahRow installed
- Git history, branches, pull requests, and reviews as native workflows
- deterministic machine-readable metadata with human-authored prose
- monorepos and code-to-work relationships as first-class concepts
- one domain engine shared by CLI, TUI, MCP, extension, web, and dashboards
- local-first operation without preventing explicit hosted adapters
- immediate team and AI awareness without a mandatory hosted service
- replaceable indexes and generated views
- schema evolution that does not silently corrupt existing repositories

Near-term work should prove the core task workflow before broadening the entity
model or investing in additional interfaces.

## Source-of-Truth Model

Canonical project state lives under `.rahrow/`.

```text
.rahrow/
├── tasks/
├── epics/
├── specs/
├── decisions/
├── releases/
├── runbooks/
├── snapshots/
├── generated/
└── cache/
```

Rules:

- Entity Markdown files are authoritative persisted state.
- `rahrow.config.ts` is the discoverable repository usage configuration. It
  controls validated behavior and defaults, not canonical entity state.
- YAML frontmatter contains structured metadata. Markdown bodies contain
  durable human context.
- Do not store the same field independently in frontmatter and body.
- `generated/` and `cache/` are derived, disposable, and never required to
  recover canonical state.
- `snapshots/` contains immutable, non-authoritative safety checkpoints for
  migrations and explicit restore workflows.
- An in-memory index or optional on-disk cache may accelerate reads, but it must
  be rebuildable from canonical files.
- Do not introduce SQLite, a remote service, browser storage, editor global
  state, or another hidden store as an undeclared authority.
- Git is the versioning and collaboration layer around the files. Do not assume
  it provides database transactions or conflict-free identifiers.
- Repository discovery walks upward for exactly `rahrow.config.ts`; canonical
  storage remains fixed under `.rahrow/`.

Any persisted format change must define validation, compatibility, migration,
and failure behavior before implementation.
