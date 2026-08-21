# Interfaces And UI

CLI, interface, UI, and frontend organization rules.

## CLI and Interface Behavior

- Keep CLI commands thin: parse arguments, call core, render results, map errors
  to exit codes.
- Keep CLI contracts scoped to active product capabilities and avoid deprecated
  command surfaces.
- Reserve stdout for requested output and stderr for diagnostics.
- Avoid interactive prompts when flags or stdin make automation possible.
- Provide deterministic structured output before integrations depend on parsing
  decorative terminal text.
- Keep platform bridge behavior in the owning app, not core.
- Keep profile validation, protocol parsing, and engine lifecycle semantics in
  shared packages. Clients may own only view-specific sorting, grouping, and
  layout.

## UI Organization

Use TypeScript and React for web interfaces. Prefer TanStack's headless
ecosystem when the feature needs the corresponding capability:

- Query only when a feature has remote state and mutations
- Form for complex validated forms
- Table for tabular state
- Hotkeys for keyboard commands
- Pacer for debounce, throttle, queue, and rate-control behavior
- Virtual for large virtualized collections
- DB for a justified client-side reactive data layer
- Devtools and library-specific devtools during development

Adopt each package by demonstrated need. Do not install the full ecosystem in
every app, use a large abstraction for trivial local state, or hide domain
rules in client caches. Review maturity and API stability before using alpha or
beta packages on critical paths.

For desktop and mobile:

- Organize by product feature, then colocate components, hooks, tests, and styles.
- Keep platform host communication behind typed adapters.
- Represent loading, empty, invalid-profile, stale, conflict, and error states
  explicitly where the workflow needs them.
- Preserve keyboard, focus, labels, roles, and screen-reader behavior.
- Share UI through a dedicated package only after more than one surface needs a
  stable visual contract.
- Do not put React stores or UI dependencies in `@rahrow/core`.
