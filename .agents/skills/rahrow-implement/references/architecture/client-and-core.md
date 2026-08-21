# Client And Core Architecture

Feature-based clients and the minimal modular core architecture.

## Feature-Based Clients

Apply feature-based architecture to presentation and interaction surfaces:
desktop, mobile, and future CLI.

Example feature roots:

```text
src/
├── app/
├── features/
│   ├── connection/
│   ├── profiles/
│   ├── subscriptions/
│   ├── import/
│   ├── diagnostics/
│   └── settings/
└── shared/
```

Guidelines:

- Colocate feature implementation, tests, fixtures, and presentation.
- Keep package entrypoints thin.
- Use `shared/` only for code genuinely shared by several features in that app.
- Promote behavior to `@rahrow/core` or `@rahrow/engine` only when ownership
  matches that package.
- Avoid generic catch-all modules such as a growing `helpers.ts`.
- Keep app-specific state and UX in the app.
- Do not duplicate protocol parsing, profile validation, or engine lifecycle
  rules in clients.

## Minimal Modular Core

Use a small modular monolith for `@rahrow/core`. Organize by domain module
before technical layer:

```text
src/
├── profiles/
├── protocols/
├── connection/
├── subscriptions/
├── diagnostics/
├── storage/
└── settings/
```

Keep this deliberately small:

- `profiles` owns normalized profile contracts and validation.
- `protocols` owns parser and serializer contracts.
- `connection` owns connection state and lifecycle contracts.
- `subscriptions` owns subscription source contracts.
- `storage` owns local persistence ports.
- `settings` owns settings contracts.
- Omit folders and layers until they contain real behavior.
- Communicate between modules through explicit public APIs, not internal file
  imports.

`@rahrow/engine` implements `ProxyEngine` contracts from core. Xray-specific
configuration generation and process lifecycle stay behind that boundary.
