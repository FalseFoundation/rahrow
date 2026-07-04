# Client And Server Architecture

Feature-based clients and the DDD-lite modular monolith for core and server code.

## Client and Server Architecture

### Feature-based clients

Apply FBA to presentation and interaction surfaces: Kanban, Office, extension,
TUI, CLI, and the documentation website.

Example feature roots:

```text
src/
├── tasks/
├── search/
├── graph/
├── projects/
├── context/
└── shared/
```

Guidelines:

- Colocate feature implementation, tests, fixtures, and presentation.
- Keep package entrypoints thin.
- Use `shared/` only for code genuinely shared by several features in that
  package.
- Promote behavior to `contracts`, `utils`, or `core` only when its ownership
  matches that package.
- Avoid generic catch-all modules such as a growing `helpers.ts`.
- Keep board state in Kanban, editor state in the extension, terminal state in
  TUI, and stakeholder presentation in Office.

### DDD-lite modular monolith

Use a modular monolith for core and future server-side code. Organize by domain
module before technical layer:

```text
src/
├── tasks/
│   ├── domain/
│   ├── application/
│   └── infrastructure/
├── graph/
├── projects/
├── search/
└── repository/
```

Keep this deliberately small:

- `domain/` contains entities, value objects, invariants, and pure policies.
- `application/` contains use cases and ports that coordinate domain behavior.
- `infrastructure/` contains filesystem, Git, process, network, and framework
  adapters.
- Omit a layer when a module does not need it.
- Communicate between modules through explicit public APIs, not internal file
  imports.
- Keep one process and one deployable unit until scale or isolation provides a
  measured reason to split it.

`@rahrow/core` is the reusable modular domain engine. If remote Office or
hosted collaboration later requires a server, introduce `apps/server/` as a
thin composition root over core. The server owns transport, authentication,
authorization, repository checkout, concurrency, and process lifecycle. It
does not become a second implementation of RahRow rules.
