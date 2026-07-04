# TypeScript And Exports

TypeScript, formatting, import, export, and package-boundary rules.

## TypeScript and Exports

Root `biome.json` controls formatting:

- tabs
- 100-column target
- single quotes
- no semicolons
- trailing commas
- bracket spacing

Follow these rules:

- Keep strict TypeScript enabled.
- Use `unknown` at filesystem, YAML, JSON, Git, process, and network boundaries,
  then validate and narrow it.
- Avoid `any`; contain unavoidable casts at the boundary.
- Use `import type` or inline type imports for type-only dependencies.
- Prefer extensionless package imports. Use `.ts` or `.tsx` for relative source
  imports; TypeScript rewrites them to `.js` during emit. Write `.js` in source
  only when a runtime or external contract requires it.
- Prefer named exports and explicit package entrypoints.
- Declare every imported package in the importing package's `package.json`.
- Use `workspace:*` for internal dependencies.
- Import shared code through package exports such as `@rahrow/core` or an
  explicit subpath. Never import a sibling package's `src/`.
- Do not use TypeScript `paths` to imitate package exports or reach another
  package's `node_modules`.
- Keep public data immutable where mutation is not part of the contract.
- Represent expected failures with typed errors or result variants. Include the
  entity path, field, and remediation when useful.
- Do not leak a CLI parser, UI framework, MCP SDK, or filesystem library type
  into domain contracts.

Shared configuration is consumed through `@rahrow/tooling` exports. Extend
those exports when a preset is genuinely reusable; keep app-specific settings
with the app.
