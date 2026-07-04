# Conventions

Use this file as the routing map for implementation conventions. Load only the
topic file needed for the change, then load additional files when the work
crosses that boundary.

## Routing

- [design.md](conventions/design.md): general design heuristics, SOLID,
  clean architecture, DDD, feature-based architecture, comments, and diff scope
- [naming-and-packages.md](conventions/naming-and-packages.md): file, symbol,
  command, package, and configuration naming
- [typescript-and-exports.md](conventions/typescript-and-exports.md):
  TypeScript style, package exports, import boundaries, dependency declarations,
  and shared configuration
- [task-files.md](conventions/task-files.md): canonical RahRow entity
  frontmatter, Markdown body, validation, relationship, timestamp, and
  serialization rules
- [interfaces-and-ui.md](conventions/interfaces-and-ui.md): CLI behavior,
  client ownership, React/TanStack preferences, Kanban, and Office UI rules
- [backend-and-tooling.md](conventions/backend-and-tooling.md): backend
  technology choices, database policy, shell scripts, and automation ownership
- [tests-and-docs.md](conventions/tests-and-docs.md): testing conventions,
  documentation ownership, docs site content rules, README rules, and completion
  documentation expectations

## Loading Guidance

- For new or renamed files, packages, exports, commands, or public types, load
  `naming-and-packages.md` and `typescript-and-exports.md`.
- For task metadata, canonical Markdown entity files, parsers, serialization,
  or validation, load `task-files.md`.
- For CLI, UI, website client, Kanban, Office, extension, TUI, or MCP behavior,
  load `interfaces-and-ui.md`.
- For scripts, backend/server technology, or dependency/tooling decisions, load
  `backend-and-tooling.md`.
- For tests, READMEs, docs, posts, or completion documentation updates, load
  `tests-and-docs.md`.
- For broad design or architecture-sensitive implementation, load `design.md`
  first, then the specific owner file.
