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
- [interfaces-and-ui.md](conventions/interfaces-and-ui.md): CLI behavior,
  client ownership, React/TanStack preferences, and product UI rules
- [backend-and-tooling.md](conventions/backend-and-tooling.md): native
  technology limits, local persistence policy, shell scripts, and automation ownership
- [tests-and-docs.md](conventions/tests-and-docs.md): testing conventions,
  documentation ownership, docs site content rules, README rules, and completion
  documentation expectations

## Loading Guidance

- For new or renamed files, packages, exports, commands, or public types, load
  `naming-and-packages.md` and `typescript-and-exports.md`.
- For CLI, desktop, mobile, or docs UI behavior, load `interfaces-and-ui.md`.
- For scripts, native technology, persistence, or dependency/tooling decisions, load
  `backend-and-tooling.md`.
- For tests, READMEs, docs, posts, or completion documentation updates, load
  `tests-and-docs.md`.
- For broad design or architecture-sensitive implementation, load `design.md`
  first, then the specific owner file.
