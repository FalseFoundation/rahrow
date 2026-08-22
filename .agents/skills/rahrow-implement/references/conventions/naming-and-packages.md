# Naming And Packages

Naming, package identity, command naming, and configuration identity.

## Naming and Package Identity

- Directories: lowercase; use kebab-case for multiword names.
- TypeScript modules: camelCase when named after behavior, kebab-case when the
  local feature already uses it. Stay consistent within an owner.
- React components and providers: `PascalCase.tsx`.
- Hooks: `useThing.ts`; exported function `useThing`.
- Variables and functions: `camelCase`.
- Types, interfaces, classes, components, and schemas: `PascalCase`.
- Stable protocol and schema constants: `UPPER_SNAKE_CASE`.
- Colocated tests: source filename plus `.test.ts` or `.test.tsx`.
- Integration and E2E specs: descriptive kebab-case ending in `.spec.ts`.
- Shell scripts: kebab-case.
- Name files and symbols for their responsibility inside the owning package.
  Prefer `config.ts`, `Config`, and `Repository` over names prefixed with the
  product or package name.
- Keep the product name only where it is part of a public identity or protocol,
  such as the future `rahrow` command, package names, app identifiers, and
  user-facing prose.

Canonical workspace identities:

```text
@rahrow/tooling
@rahrow/core
@rahrow/engine
@rahrow/app-desktop
@rahrow/app-mobile
@rahrow/www
@rahrow/ui
```

`@rahrow/core` is the public domain contract package. `@rahrow/engine`,
`@rahrow/ui`, and apps remain private until their release and runtime contracts
are deliberately defined.

Use the exact current manifest name in dependencies, filters, and Changesets.
Package directories and names must agree. Fix duplicate or misplaced identities
instead of documenting aliases for accidental scaffold state.

Command names use lowercase kebab-case:

```text
rahrow profile-import
rahrow engine-status
```

Keep configuration fields behavioral and avoid path indirection that bypasses
declared ownership boundaries.

Entity field names use `camelCase`. Status, priority, and type values use stable
lowercase tokens such as `doing`, `high`, and `feature`.
