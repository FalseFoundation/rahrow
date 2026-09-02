# RahRow Workflow and Conventions

## Installed Skills

Use installed skills deliberately. When a task matches an available skill, read that skill before acting.

- Always use `rahrow-implement` for RahRow implementation, migration, review, architecture, package, frontend feature, protocol, engine, storage, UI, testing, or tooling work.
- Use `taskset` when planning, creating, updating, inspecting, or closing repository tasks in `.taskset/`.
- Use `turborepo` when changing scripts, `turbo.json`, package tasks, package boundaries, affected runs, caching, or monorepo workflow.
- Use `shadcn` when adding, updating, or debugging Shadcn-style components or `components.json`.
- Use `tdd` when the task asks for test-first work or when implementing high-risk protocol/engine behavior where a red-green-refactor loop is useful.
- Use React/frontend skills when changing React architecture, performance, composition, or reusable component APIs.

Do not bypass a relevant installed skill because local files appear simple. The skill is part of the repository operating procedure.

## Taskset and Planning

Taskset is RahRow's default task manager and the planning/task source of truth:

- Inspect task context before large implementation or migration work.
- Create or update tasks with the repository-local CLI (`pnpm exec taskset`, with `pnpm taskset` as the accepted shortcut) when planning work that should persist.
- Prefer Taskset commands over hand-editing `.taskset/tasks/*` when commands exist.
- Use Taskset to capture phase plans, status, dependencies, and follow-up work.
- Do not create or maintain a parallel task store, hidden task database, or alternate tracker as repository authority.

Keep Git as the history layer; Taskset tracks planned work and task state.

## Changesets

Use Changesets for changes that affect package consumers:

- public package exports
- package behavior
- dependency requirements
- package names or entrypoints
- release notes that downstream users need

Do not add a changeset for purely internal docs, tests, local refactors, or app-only work unless it changes a published package contract.

## Scripts and Turbo

Current root script vocabulary:

- `dev`
- `build`
- `test`
- `watch`
- `lint`
- `format`
- `check`
- `cleanup`
- `update-deps`

Current package task vocabulary:

- `watch`
- `build`
- `typecheck`
- `test`
- `cleanup`
- app-specific `dev` / `build` variants where needed

Use `watch` for persistent TypeScript watch tasks.

Root scripts should delegate with `turbo run <task>` when the task belongs to packages. Package scripts own the actual package command.

## Naming

Use consistent, boring names. Names should reveal layer and behavior without encoding implementation details.

Files and directories:

- Use kebab-case for ordinary TypeScript files and directories: `connection-profile.ts`, `xray-config-builder.ts`, `profile`.
- colocate tests with implementation using `.test.ts` or `.test.tsx`.
- React component files use PascalCase filenames and export PascalCase symbols: `ProfileEditor.tsx`, `ConnectionStatus.tsx`.
- Feature component styles use colocated CSS Modules with a matching PascalCase stem: `ProfileEditor.module.css`, `ConnectionStatus.module.css`. Import the module as `styles` and use camelCase class names: `styles.panel`, `styles.statusRow`.
- React hook files use camelCase filenames and export camelCase hook symbols: `useProfileSelection.ts`, `useConnectionActions.ts`.
- Feature directories use plural or domain nouns where natural: `profiles`, `subscriptions`, `connection`, `diagnostics`, `settings`, `import`.
- Do not repeat structural category names in filenames when the directory already provides that context. Prefer `Profiles.tsx`, `ConnectionPanel.tsx`, `profile-management-model.ts`, or `profile-selection-model.ts` over `ProfilesFeature.tsx`, `ConnectionFeature.tsx`, or `profile-feature-model.ts`.
- Avoid generic names such as `utils.ts`, `helpers.ts`, `manager.ts`, `service.ts`, and `types.ts` when a domain name is available.

Symbols:

- PascalCase for components, classes, interfaces, type aliases, schemas, and enum-like objects: `ConnectionProfile`, `ProfileStore`, `ProfileEditor`.
- camelCase for functions, variables, hooks, and object fields: `parseConnectionUrl`, `useProfileSelection`.
- Hooks start with `use`.
- Zod schemas end with `Schema`: `ConnectionProfileSchema`.
- Errors end with `Error`: `UnsupportedProtocolError`.
- Interfaces describe capability contracts without `I` prefixes: `Clipboard`, `Share`, `ProxyEngine`, `ProfileStore`.
- Boolean values read as predicates: `isConnected`, `canParse`, `hasSubscriptions`.

Components:

- Shared primitives live under `packages/ui/src/components/ui`.
- Product screens and composed feature components live in `packages/features` so desktop and mobile stay visually identical.
- Feature UI uses CSS Modules for layout and composition. App shells must not restyle those screens.
- Component names describe product concepts, not layout mechanics: `ProfileList`, `ConnectionStatus`, `SubscriptionImportDialog`.

## Architecture Vocabulary

- DDD: Use domain language in core/protocol/engine boundaries. Keep value objects and aggregates small.
- FBA: Frontend app domains are `features`; each feature owns local UI, hooks, state, and app orchestration.
- Lightweight TDD: Write tests first where behavior is fragile or security-sensitive, then implement, pass, and refactor.
- Composition > Inheritance: Prefer registries, pipelines, small capability interfaces, and composed data models.
