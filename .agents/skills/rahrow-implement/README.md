# Engineering handbook

Portable rules for building a small, local, multi-surface product: shared domain, thin platform shells, interchangeable adapters, and no foundation rewrites.

This document is independent of any one repository layout, product category, or vendor runtime. Folder names below are illustrations of **ownership**, not a required tree.

Treat these rules as mandatory standards, not optional taste. Existing code is evidence, not authority. Keep or extend a shape only when it matches the target. If current code violates a rule, do not copy that shape into new work. Fix the local violation when scope allows, or state the violation and keep the new code aligned.

A request to apply architecture, migrations, or these practices over a codebase is a **structural pass**. Do not satisfy it with only type fixes, validation additions, tests, or local hardening.

---

## North star

Build a **minimal, clean, composable, scalable** local application first.

- Multiple surfaces (CLI, desktop, mobile, later surfaces) share reusable domain and application logic.
- Desktop and mobile product UI is the same product, not two products.
- Native code exists only at the platform edge.
- An external engine, sidecar, SDK, or vendor runtime is an **adapter**, not the domain model.

Optimize for clarity, composability, correctness, and future extension **without rewriting** the domain, UI, data model, or application architecture.

The product must remain fully useful without optional extras (ads, extra engines, extra protocols, cloud sync, analytics, telemetry).

---

## Ways of thinking

### Architecture plan beats current code

The architecture is the source of truth. Current apps, packages, and adapters are evidence. Keep code only when it is useful **and** aligned. Do not preserve a broken shape because it already exists.

### Name the owning layer first

Before coding, identify which layer owns the behavior:

- domain
- protocol / interchange format
- ingestion / sync source
- engine / runtime adapter
- storage
- platform capability
- frontend feature
- shared UI primitive
- tooling

Keep the edit in that layer unless a real dependency boundary requires a small companion change.

### Importance is not a package

A concept being important is not enough reason to create a new package. Prefer the minimum meaningful boundary and leave the code easy to move later.

### Extract on reuse, not on imagination

Start features next to the app that needs them. Extract the reusable layer only when it is actually reused and has a clear public API:

- domain logic → domain package
- parse/serialize/normalize → protocol package
- runtime control → engine contract + adapter
- platform-specific code → app/native edges
- reusable primitives → UI package
- shared screens and feature behavior → shared frontend feature layer

Do not force complete feature sharing when only the underlying logic is reusable.

### Prefer composition, registries, and pipelines

Composition over inheritance. Prefer registries, pipelines, small capability interfaces, and composed data models. Do not build `BaseThing → VariantA → VariantB` hierarchies.

### Frontend features own product UI; components do not own workflows

Screen, panel, dialog, and card files mainly compose UI, wire handlers, and present state. Behavior, workflows, state transitions, async orchestration, and derived data live in named hooks, feature models, stores, command/query helpers, or lower-layer APIs.

A component that constructs stores/registries/engines, performs persistence, calls platform APIs, handles import/export, and renders a full screen is a refactor target. Extract before extending it.

### Shared product UI across surfaces is the default

If two graphical apps present the same product, start those screens in the shared feature layer. App-local features exist only for genuinely platform-unique composition.

Platform chrome may differ (tray, system bars, permission sheets). In-app UI must not.

### Large work stays large

For a large architecture or migration request, do not shrink the task to a local patch. Build a repo-level plan, audit boundaries and consumers, execute coherent phases, verify each phase, and continue until the pass is genuinely handled or a concrete blocker stops progress.

Tests, types, schemas, and injectable helpers are support work. They do not complete a migration if structural ownership is still wrong.

### Stop only for real stop conditions

Do not stop merely because the change is large. Stop when:

- the requested pass is complete
- a concrete technical blocker prevents meaningful progress
- required external approval is denied
- a verification failure is an unrelated pre-existing issue that should be recorded, not silently folded in

Do not stop at the first green test run if the audit still shows in-scope architectural work.

If blocked, report the exact blocker, affected phase, and the next command or decision needed.

---

## Non-negotiables

- **Composition > inheritance.**
- Use domain-driven design where it clarifies language, aggregates, value objects, and boundaries. Do not turn DDD into ceremony.
- Use feature-based architecture for frontend code: app-facing domains are features. Each feature owns local UI, colocated styles, state, hooks, and app orchestration until shared extraction is justified.
- Keep graphical product UI identical across apps. Shared screens, layout, typography, spacing, visual hierarchy, and feature composition live in the shared feature layer. Apps are thin shells for bootstrap, native capability wiring, and entry points.
- Style feature UI with colocated CSS Modules. The UI package owns primitives and tokens. Feature CSS Modules own feature layout and composition. Do not style feature screens with ad hoc global CSS, duplicated per-app stylesheets, or utility-class soup in feature files.
- Keep feature logic separated from final interface components.
- Use lightweight TDD for critical behavior.
- Apply SOLID through small interfaces, explicit dependencies, and dependency inversion.
- Keep a **minimal monolith** with a shallow dependency graph.
- Keep reusable domain logic and application capabilities out of platform-specific apps.
- Put platform implementations at the edges.
- Hide engine/runtime implementations behind interfaces.
- Do not create barrel or compatibility export files (`index.ts`, `platform.ts`, `schemas.ts`, or similar wrappers). Export symbols only from the files that define them. Import exact files directly.
- Package export maps should expose source files with a glob, such as `"./*": "./src/*"`, instead of listing each public file or folder one by one.
- Avoid premature abstraction, empty packages, package-per-folder architecture, and framework-driven architecture.
- Do not duplicate business logic across surfaces.
- Do not duplicate reusable frontend feature logic across graphical apps. Extract shared app-facing feature code when it is actually reused and has a clear API. Keep pure domain/application behavior in the owning lower-level package.
- Do not add a backend, database server, object storage, message broker, cache, generated API layer, unnecessary native code, or unnecessary libraries.
- Do not optimize for hypothetical scale.

---

## Stack philosophy

Choose a small, explicit stack and keep it. Do not introduce a second framework for the same job.

Typical shape for this class of product:

- TypeScript everywhere for domain and application logic
- workspace manager + task runner + formatter/linter + typed validation + React + Vite + a single test runner
- desktop: web UI + a thin native host
- mobile: the same web UI + a thin native host
- native languages only for OS APIs that TypeScript cannot reach

The shared UI package is the design system. Add variants, tokens, and primitives there, then consume them. Feature screens still use CSS Modules for their own layout, even when they consume primitives.

Prefer a coherent library family for frontend infrastructure (routing, async server-like state, complex forms, shared client state, throttle/debounce, hotkeys, virtualization). Do not build ad hoc alternatives when a library already matches the need.

Do not introduce server frameworks, ORMs, document databases, object storage, brokers, caches, generated HTTP API layers, a second React meta-framework, or a second mobile runtime for the initial client architecture.

---

## Layers and dependency direction

Prefer the **minimum number of meaningful boundaries**. If two areas are tightly coupled and have one consumer, keep them together until extraction reduces coupling or prevents duplication.

This is a boundary map, not permission to create empty packages.

### Illustrative surfaces

- **CLI**: process UI. Reuses domain and application capabilities. No desktop/mobile host.
- **Desktop**: React + web bundler + native host. Native code exists only for native access and process/platform integration.
- **Mobile**: React + web bundler + native host. Native code exists only for VPN/OS networking APIs, engine integration, and platform capabilities.

### Illustrative packages (create only when justified)

| Layer | Owns |
| --- | --- |
| Domain / core | Concepts and orchestration usable from every surface and from tests |
| Protocols | Parse, serialize, normalize, validate interchange formats |
| Engine | Small runtime contract and adapters |
| Features | Shared frontend feature behavior, hooks, models, state adapters, screens, CSS Modules |
| Ingestion | Fetch, decode, parse, normalize external sources |
| Platform contracts | Small capability interfaces |
| Storage | Local persistence if a separate abstraction is justified |
| UI | Intentionally small shared primitives and tokens |
| Tooling | Shared config helpers |

### Dependency graph (keep it shallow)

```text
applications -> domain -> protocols / engine / storage / ingestion
applications -> features -> domain / protocols / ingestion / engine / storage
applications -> features -> ui
applications -> ui
engine -> concrete runtime
```

Never allow domain/core to depend on React, UI, desktop host, mobile host, bundler, browser APIs, Node-specific APIs, or native APIs.

Never allow the shared feature layer to depend on a specific app, native host, native APIs, app-private files, or route-specific app composition.

```text
apps -> shared features -> domain / protocols / ingestion / engine / storage
apps -> shared features -> ui
apps -> ui
```

The shared feature layer must not depend on desktop, mobile, native hosts, native APIs, or app-private files. Native implementations and bootstrap stay in apps. Do not create a root-level `features/` directory or an empty features umbrella.

---

## Domain modeling

Domain code must be usable from CLI, desktop, mobile, tests, and future apps.

Keep models **minimal**. Model what the product needs, not every field of the vendor config. Engine-specific details belong in engine adapters.

Prefer a **composed** shape over subclassing:

```ts
type Entity = {
  kind: Kind;
  target: Target;
  channel?: Channel;
  security?: Security;
  authentication?: Authentication;
  metadata?: Metadata;
};
```

Do not create inheritance hierarchies such as `BaseEntity -> KindA -> KindB -> KindC`.

Use domain language at domain, protocol, and engine boundaries. Keep value objects and aggregates small.

---

## Interchange: parse, import, export, ingest

Implement format-specific behavior through small parsers, serializers, validators, and normalizers composed through a **registry / pipeline**.

Parser shape:

```ts
interface Parser<T> {
  canParse(input: string): boolean;
  parse(input: string): T[];
}
```

All imports converge into one pipeline:

```text
Input -> Decode -> Detect -> Parse -> Normalize -> Validate -> Domain model
```

Input sources include URLs, remote lists, clipboard, manual entry, shared links, QR codes, and future files. Do not implement separate creation logic per input method.

Exports follow:

```text
Domain model -> Serializer -> Canonical string -> Clipboard / Share / QR
```

QR, clipboard, and sharing are **transports / capabilities**. They must not contain protocol logic.

External lists and feeds are **data sources**, not entity types:

```text
Source URL -> Fetch -> Decode -> Parse -> Normalize -> Validate -> Domain model[]
```

Ingestion code must not depend on React, native hosts, or the engine runtime.

---

## Engine and runtime adapters

Expose a **small** engine contract. The rest of the product depends on the contract, not the vendor.

```ts
interface Runtime {
  readonly id: string;
  start(input: StartInput): Promise<void>;
  stop(): Promise<void>;
  restart(input: StartInput): Promise<void>;
  status(): Promise<Status>;
  test(entity: Entity): Promise<ProbeResult>;
}
```

Do not expose vendor JSON or vendor config objects to the UI.

The adapter owns config generation, process or session lifecycle, and engine-specific settings:

```text
Domain model -> ConfigBuilder -> Vendor configuration -> Runtime
```

Treat the engine as an **external runtime**:

- Desktop: sidecar / spawned process
- CLI: process manager
- Mobile: native bridge to OS networking + engine

Do not embed one language runtime inside another, and do not create FFI, unless a real OS requirement forces it.

Future engines implement the same contract. The domain, UI, profile/entity model, and application architecture must not need a rewrite.

---

## Lifecycle, diagnostics, and storage

Own lifecycle states in the domain, not in scattered UI components. A typical session lifecycle:

- `Idle` / `Disconnected`
- `Starting` / `Connecting`
- `Running` / `Connected`
- `Stopping` / `Disconnecting`
- `Error`

Keep diagnostics honest and small. Probe latency or reachability; do not brand a probe as a speed test if it is not one.

Use **local persistence**, not a database server. Define minimal store interfaces where useful:

```ts
interface Store<T> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | null>;
  save(item: T): Promise<void>;
  remove(id: string): Promise<void>;
}
```

Validate when reading persisted data. Treat persisted data as **untrusted input**.

---

## Platform capabilities

Create **small capability contracts** instead of one giant `PlatformService`. Examples:

- Clipboard
- Share
- QR scanning
- QR generation
- Notifications
- Autostart
- System proxy
- VPN / OS networking
- File picker

Each runtime implements only the capabilities it supports.

Platform capability calls must be injected through a capability boundary or hook input. Do not scatter them through presentational components.

---

## Frontend: features, UI, and state

### Feature-based architecture

Frontend domains are features. Application-local features are the default until sharing is real.

Keep each feature in its own file architecture. Features may use neighboring features through **clear public exports**, route/app composition, shared domain contracts, shared UI primitives, platform capabilities, or extracted package APIs. Do not merge multiple feature architectures into one catch-all directory.

### What lives where

| Place | Owns |
| --- | --- |
| Final interface (screen, panel, dialog, card) | Compose UI, wire events, present state |
| Hooks | React state, effects, memoized derived state, app-facing commands |
| Feature model / helper files | Pure transformations, selection rules, validation adapters, payload builders, status derivation |
| Shared client store | Shared client state |
| Query library | Server-like async state |
| Form library | Complex form state |
| UI package | Primitives, variants, tokens |
| Feature CSS Modules | Feature layout and composition |
| Apps | Bootstrap, native wiring, platform chrome |

Do not rebuild store/query/form concerns with ad hoc state trees.

### Shared feature layer vs apps

Use the shared feature layer for product UI that more than one graphical app presents: hooks, feature models, shared state adapters, reusable feature-level components, shared screens, and colocated CSS Modules.

Pure domain, protocol, ingestion, engine, storage, and session behavior belongs in its owning package.

Native capability implementations, app bootstrap, and platform chrome stay in apps.

When a repeated primitive need appears, add the variant, token, or primitive to the UI package, then consume it from features/apps.

### Visual identity

Graphical apps must look identical: same screens, routes, layout, typography, spacing, visual hierarchy, and interaction chrome. Do not maintain a separate visual design per app.

### State library roles

- React state: local UI state
- Shared store: centralized reactive client state
- Query library: remote / server-like async state
- Local storage abstractions: persistence
- Form library: complex configuration forms
- Router: frontend routing
- Hotkeys: meaningful keyboard commands
- Virtualization: large lists
- Pacing: throttle/debounce for refresh, probes, search, filtering

### Product surface (example of connection-oriented UI)

Main interface is organized around the primary job, not around internals. Typical screens: home, entities, sources, import, diagnostics, settings.

Home prioritizes current session, state, start/stop, current entity, last probe, and quick selection.

Entity management supports add, edit, duplicate, delete, import, export, share, QR, and probe.

Import supports URL, clipboard, QR, shared URL, source list, and manual input.

### Optional capabilities stay optional

Ads, extra engines, extra protocols, advanced routing, cloud sync, analytics, and telemetry:

- come only after the core product works
- are introduced independently
- must never contaminate domain, protocol, engine, or storage
- exist only as an optional application capability / extension point

Create an extras package only when actually implementing it. The product must remain fully functional without the provider.

---

## Isolation rules

Each feature, module, or domain owns its internal file architecture. Keep neighboring folders separate even when they collaborate.

### Allowed dependencies

- app feature → domain contracts
- app feature → UI primitives and tokens
- app feature → platform capability interfaces exposed by the app/runtime
- app feature → explicit public API from an extracted package
- app feature → neighboring feature **public** export when app composition genuinely needs it
- shared package → lower-level contracts it explicitly owns

### Forbidden dependencies

- feature → another feature's private internals when a public export or shared owner is more appropriate
- domain → app, UI, native host, browser, Node, or native APIs
- protocol/domain module → engine internals unless it **is** the engine adapter
- shared UI → app feature code

If two features need the same reusable logic, extract it to the nearest meaningful owner. Do not combine their directory structures.

When a feature needs a sibling's behavior:

1. Ask whether it belongs in domain, protocol, engine, UI, or an app-level composition file.
2. If it is app-only orchestration, move it up to the route/app layer and pass it down.
3. If it is reusable domain behavior, extract it to the owning package with tests.
4. If it is reusable UI, move a primitive or variant to the UI package, not the full feature screen.
5. If a neighbor should use it, expose it from an exact owning feature file with a clear domain name.
6. If it is truly private, keep it private.

Use a screens package only when the shared unit is genuinely a screen-level composition reused as a screen. Prefer not to put domain logic there. Product screens that multiple apps show belong in the shared feature layer, not duplicated app folders.

Use a generic `modules` package only for broad mixed modules with a clear public API and stable boundary. It is more ambiguous than features; avoid it unless the module is intentionally broader than frontend feature code.

Prefer domain-specific package names when the reusable boundary is not frontend UI.

Do not create `features`, `screens`, or `modules` packages as empty umbrellas.

---

## Good and bad shapes

### Good: feature owns UI, styles, hooks, and models

```text
packages/features/src/
├── session/
│   ├── components/
│   │   ├── SessionStatus.tsx
│   │   ├── SessionStatus.module.css
│   │   ├── StartButton.tsx
│   │   └── StartButton.module.css
│   ├── hooks/
│   │   └── useSessionActions.ts
│   ├── session-model.ts
│   ├── SessionPanel.tsx
│   └── SessionPanel.module.css
├── entities/
│   ├── components/
│   │   ├── EntityList.tsx
│   │   ├── EntityList.module.css
│   │   ├── EntityEditor.tsx
│   │   └── EntityEditor.module.css
│   ├── hooks/
│   │   └── useEntitySelection.ts
│   ├── entity-management-model.ts
│   ├── Entities.tsx
│   └── Entities.module.css
└── sources/
    ├── components/
    │   ├── SourceList.tsx
    │   └── SourceList.module.css
    ├── hooks/
    │   └── useSourceRefresh.ts
    ├── source-model.ts
    ├── Sources.tsx
    └── Sources.module.css
```

Why this is good:

- Product screens live in the shared feature layer, so graphical apps render the same UI.
- Each feature owns its UI, colocated CSS Modules, and hooks.
- Components render; hooks and model files own reusable behavior and derived state.
- Cross-feature usage goes through exact public files, route/app composition, or package APIs.
- Component files use PascalCase, CSS Modules match the component stem, hook files use camelCase, ordinary TS files and directories use kebab-case.

### Bad: catch-all folders, private coupling, generic dumps

```text
apps/desktop/src/features/
├── entities/
│   ├── components/
│   │   └── EntityList.tsx
│   ├── hooks.ts
│   ├── helpers.ts
│   ├── types.ts
│   └── EntityManagement.tsx
├── sources/
│   ├── SourceScreen.tsx
│   └── importsEntitiesInternals.ts
└── shared/
    ├── everything.ts
    ├── service.ts
    └── utils.ts
```

Why this is bad:

- One feature depends on another feature's internals instead of a public export or shared owner.
- Generic `shared`, `utils`, `helpers`, and `service` files hide ownership.
- Common logic has no clear domain owner.
- Screen components become workflow owners when they own persistence, import/export, platform APIs, engine calls, selection, ingestion, and rendering at once.
- Neighbor features become coupled and hard to move.

### Good: extract domain separately from shared screens

When two apps need the same parsing or selection rules, extract **domain** logic to the owning package. Shared screens stay in the shared feature layer:

```text
packages/core/src/entity/
├── entity.ts
├── entity-selection.ts
└── entity-selection.test.ts

packages/features/src/entities/
├── EntityList.tsx
├── EntityList.module.css
└── useEntitySelection.ts

apps/desktop/src/main.tsx
apps/mobile/src/main.tsx
```

Why this is good:

- Shared behavior lives in the domain/application layer.
- Shared screens and CSS Modules live in the shared feature layer.
- Apps stay visually identical; apps only bootstrap platform capabilities.

### Bad: mixed-concern package named after a noun

```text
packages/entities/
├── desktop-entity-screen.tsx
├── mobile-entity-screen.tsx
├── entity-store.ts
├── vendor-runtime-config.ts
└── entity-ads-slot.tsx
```

Why this is bad:

- UI, storage, vendor config, and ads are mixed into one package.
- Platform-specific screens moved too early.
- Engine and ads contaminate domain boundaries.
- The package is named after a concept but has no clean public purpose.

### Good: modular domain by language

```text
packages/core/src/
├── session/
│   ├── session-state.ts
│   ├── session-lifecycle.ts
│   └── session-lifecycle.test.ts
├── entity/
│   ├── entity.ts
│   ├── entity-schema.ts
│   └── entity-schema.test.ts
└── diagnostics/
    ├── probe-result.ts
    └── probe-result.test.ts
```

Why this is good:

- Domain language is explicit.
- Tests sit near behavior.
- Modules can evolve without knowing app or engine details.

### Bad: dumping ground in domain

```text
packages/core/src/
├── types.ts
├── utils.ts
├── constants.ts
├── vendor-json.ts
├── desktop-storage.ts
└── react-context.tsx
```

Why this is bad:

- Domain ownership is unclear.
- Vendor config, desktop storage, and React leak into core.
- Generic files become dumping grounds.

---

## Naming and handwriting

Use consistent, boring names. Names should reveal **layer and behavior** without encoding implementation details.

### Files and directories

- kebab-case for ordinary TypeScript files and directories: `connection-profile.ts`, `config-builder.ts`, `profile`
- Colocate tests with implementation: `.test.ts` / `.test.tsx`
- React component files use PascalCase filenames and export PascalCase symbols: `ProfileEditor.tsx`
- Feature component styles use colocated CSS Modules with a matching PascalCase stem: `ProfileEditor.module.css`. Import as `styles`. Use camelCase class names: `styles.panel`, `styles.statusRow`
- React hook files use camelCase filenames and export camelCase symbols: `useProfileSelection.ts`
- Feature directories use plural or domain nouns: `profiles`, `sources`, `session`, `diagnostics`, `settings`, `import`
- Do not repeat structural category names in filenames when the directory already provides that context. Prefer `Profiles.tsx` or `profile-selection-model.ts` over `ProfilesFeature.tsx` or `profile-feature-model.ts`
- Avoid generic names such as `utils.ts`, `helpers.ts`, `manager.ts`, `service.ts`, and `types.ts` when a domain name is available

### Symbols

- PascalCase: components, classes, interfaces, type aliases, schemas, enum-like objects
- camelCase: functions, variables, hooks, object fields
- Hooks start with `use`
- Schemas end with `Schema`
- Errors end with `Error`
- Interfaces describe capability contracts **without** `I` prefixes: `Clipboard`, `Share`, `Runtime`, `Store`
- Booleans read as predicates: `isConnected`, `canParse`, `hasSources`

### Components

- Shared primitives live in the UI package
- Product screens and composed feature components live in the shared feature layer so graphical apps stay visually identical
- Feature UI uses CSS Modules for layout and composition. App shells must not restyle those screens
- Component names describe product concepts, not layout mechanics: `ProfileList`, `SessionStatus`, `SourceImportDialog`

---

## Tooling, docs, and operating procedure

Use the workspace task runner for package tasks. Keep a small script vocabulary, for example: `dev`, `build`, `test`, `watch`, `lint`, `format`, `check`, `cleanup`, `update-deps`, and package-level `typecheck`. Use `watch` for persistent TypeScript watch tasks.

Root scripts should delegate to the task runner where the task can live in packages. Package scripts own package-specific implementation.

Use one test runner. Do not introduce another.

Use the planning tool for planned work and task state. Use Git as the history layer. Do not duplicate task-runner and planning-tool responsibilities.

Use change files when a change affects published packages, package APIs, or release notes. Do not add a changeset for purely internal docs, tests, local refactors, or app-only work unless it changes a published package contract.

Shared TypeScript config belongs in a tooling package when useful. Keep variants minimal: base, react, node, and native-host-specific only where needed.

Root docs stay focused: `README`, contributing, security, code of conduct, license. Do not create README/CHANGELOG/agent files for every tiny directory.

### Installed skills

When a task matches an available skill, read that skill before acting. Do not bypass a relevant skill because local files appear simple. The skill is part of the repository operating procedure.

Use the matching skill for:

- this architecture and implementation work
- persistent task planning
- workspace/task-runner/package-boundary work
- design-system components
- test-first work on high-risk parse/runtime behavior
- React architecture, performance, composition, or reusable component APIs

Prefer planner commands over hand-editing task files when commands exist.

---

## Testing and done

### Strategy

Tests should focus on **behavior and architecture boundaries**. High-value targets:

- parsing
- serialization
- normalization
- validation
- ingestion
- engine config generation
- lifecycle transitions
- storage serialize/deserialize
- probe result handling

Add UI tests when behavior is non-trivial. Do not test every trivial wrapper.

### Lightweight TDD

```text
Fail -> Implement -> Pass -> Refactor
```

Apply this especially to parsers, serializers, normalization, config generation, ingestion, and lifecycle.

Protocol and interchange tests should become **executable specifications**.

### Organization

Keep tests close to implementation:

```text
packages/protocols/src/format-a/parser.ts
packages/protocols/src/format-a/parser.test.ts
```

Avoid a giant unrelated top-level `tests/` directory. Integration tests may live at app/package boundaries when that is where the behavior exists.

### Untrusted input

Prioritize malformed-input tests: invalid identifiers, missing required fields, invalid ports, corrupt encodings, invalid JSON, unsupported transports, garbage, and hostile input.

Parsers must **fail safely**.

### Definition of done (architecture)

Work is complete when:

- the repository is substantially smaller and understandable by one developer
- obsolete packages and unnecessary frameworks/infrastructure are removed
- no backend infrastructure remains
- TypeScript owns the domain
- the vendor runtime owns networking/process details behind an engine interface
- each native host owns only its native integration
- CLI shares the same domain logic
- required formats, ingestion, import/export, clipboard, QR, sharing, probing, and local persistence work
- application state is cleanly separated
- optional extras have only an extension point and do not contaminate core
- future engines can implement the runtime contract
- meaningful tests exist around protocol/configuration boundaries
- there is one test runner
- the dependency graph remains shallow
- there are no meaningless packages or empty architectural placeholders
- apps do not duplicate domain logic
- graphical product UI is identical and driven by the shared feature layer
- feature UI uses colocated CSS Modules rather than duplicated app stylesheets

---

## Migration

### Principles

Do not blindly preserve existing structure. Inspect apps, packages, native code, runtime code, dependencies, scripts, configuration, and core implementation. Classify each piece as **keep, move, merge, or delete**.

Avoid empty placeholders. Create packages, directories, configs, scripts, native code, and docs only when they immediately carry useful implementation or a meaningful boundary.

An architecture migration must address **structure and ownership**, not only correctness details. Type fixes, schemas, tests, injectable clocks, and validation improvements are useful only as part of a broader boundary pass unless the user explicitly asked for a small hardening task.

### Default phases

1. Repository cleanup: obsolete packages, frameworks, services, scripts, dependencies, duplicated logic
2. Establish the workspace: apps / packages / engines / scripts; toolchains; remove unused framework config and stale scripts
3. Establish domain: minimal models with schema validation
4. Protocol layer: parse / normalize / serialize through a registry/pipeline
5. Ingestion layer: fetch / decode / parse / normalize using the same parser registry
6. Engine: contract, adapter, config builder, process/session; isolate vendor configuration
7. Storage: local persistence; validate persisted data
8. Desktop: shared UI + thin native host; sidecar/process; keep native code minimal
9. Mobile: same UI + isolated OS networking integrations
10. CLI: commands that reuse domain, protocols, ingestion, engine, and storage
11. UI refinement: actual product UX without an enormous design system
12. Optional capabilities: only after the core product works, added independently

### Package extraction rule

Start application features inside apps. Extract only the reusable layer. Do not force complete feature sharing when only underlying logic is reusable.

### Removal targets

Remove or avoid, unless a current concrete product requirement justifies them:

- extra numeric libraries for money/precision you do not need
- server frameworks
- ORMs and database servers
- object storage
- message brokers
- caches
- generated API layers
- a second web or mobile UI stack
- multiple state managers
- native networking stacks that duplicate the engine
- duplicated application logic

---

## Large architecture pass

A broad command to apply architecture and practices over packages and then apps is permission to perform a large, multi-phase refactor. Do not reduce it to a narrow cleanup unless the user explicitly scopes it down.

If the user names only some packages, still reason globally. Those packages define contracts consumed by every surface. A real pass may require touching consumers, exports, workspace structure, scripts, tests, docs, and planning/release artifacts.

### Operating mode

Treat the request as an **architecture migration**, not a code review.

- Load architecture, migration, testing, workflow, and modularity rules before making broad changes.
- Inspect the actual repository state before deciding what to keep, move, merge, delete, or rewrite.
- Produce an architecture audit before editing: current responsibilities, dependency direction, duplicated logic, misplaced platform/engine/app code, missing boundaries, stale packages, and affected consumers.
- Treat tests, types, schemas, and validation as support work.
- Prefer codebase graph discovery when available; use file search for configs, scripts, manifests, and non-code artifacts.
- Use the planner for persistent planning when work spans phases.
- Use change files when public APIs or release-facing contracts change.
- Use installed skills that match subareas.

### Minimum bar

A large pass is not complete until you have checked and either changed or explicitly ruled out:

- package responsibilities and public exports
- dependency direction between apps, domain, engine, UI, platform, storage, protocols, and ingestion
- duplicated domain/protocol/engine/application logic
- platform-specific code leaking into domain packages
- engine-specific configuration leaking into UI, apps, or domain models
- feature/module file architecture in apps
- workspace scripts, tasks, and package manifests
- tests for behavior changed by the refactor
- docs, planning, and change files where the change affects planning or public package behavior

If the audit finds the architecture already correct, say so with concrete evidence. Otherwise implement the structural changes. Do not stop at local improvements.

### Execution order

1. Repository and task audit
2. Architecture map: current vs target responsibilities before editing
3. Domain package: clean contracts, validation, lifecycle, storage/platform/ingestion contracts, public exports, tests
4. Engine package: contract, adapter/config/process boundary, probe contract, exports, tests that do not require a live vendor runtime
5. Shared packages: UI, tooling, protocols/ingestion/storage if they exist or are justified
6. CLI: wire shared behavior without duplicating it
7. Desktop: web UI around shared logic; native code minimal and edge-only
8. Mobile: same web UI; native capabilities edge-only
9. Scripts, tooling, docs
10. Verification: targeted tests during phases; strongest practical repo-level checks at the end

Adjust order when dependency direction requires it. Do not start app rewrites by duplicating missing domain behavior inside apps.

### Acceptable large changes

- moving behavior from apps into the owning package
- moving code out of domain or engine when it belongs elsewhere
- deleting obsolete framework/config/dependency remnants
- renaming files to match naming conventions
- replacing inheritance or class-heavy structures with composed contracts, registries, pipelines, and functions
- splitting mixed files into domain-owned modules
- changing app imports and package exports to match the new boundary
- adding tests around protocol, validation, ingestion, engine config, lifecycle, and persistence

### Not acceptable

- adding empty packages as architecture placeholders
- introducing new frameworks or services outside the plan
- moving all code into generic `shared`, `common`, `utils`, `modules`, or `services` directories
- preserving broken architecture just because it already exists
- stopping after a surface-level pass when deeper coupling remains
- reporting success after only adding tests, schemas, ids, or injectable helpers when responsibilities remain unexamined

### Planning granularity

Maintain a visible phase checklist. A good phase is large enough to complete a meaningful boundary and small enough to verify.

```text
Audit -> Architecture map -> Domain -> Engine -> Shared packages -> CLI -> Desktop -> Mobile -> Tooling/docs -> Final verification
```

Within each phase:

- identify current behavior and public exports
- decide keep / move / merge / delete / rewrite
- inspect direct consumers before changing contracts
- make the minimum coherent architecture change
- update consumers so the architecture is actually applied
- add or update tests where behavior changes
- run targeted verification for that phase
- record follow-up tasks only for work that cannot be completed in the current pass

### Final report for a large pass

- phase summary
- architecture audit: what was wrong, what was already aligned, what changed
- major architectural changes
- package/app areas touched
- consumer updates across apps/packages
- tests/checks run and results
- known follow-ups or blocked items
- whether change files or planner entries were created/updated

---

## Vocabulary

| Term | Meaning |
| --- | --- |
| DDD | Use domain language at core/protocol/engine boundaries. Keep value objects and aggregates small. No ceremony. |
| FBA | Frontend app domains are features. Each feature owns local UI, hooks, state, and app orchestration. |
| Lightweight TDD | Write tests first where behavior is fragile or security-sensitive, then implement, pass, and refactor. |
| Composition | Prefer registries, pipelines, small capability interfaces, and composed data models over inheritance. |
| Edge | Native host, OS API, process sidecar, or capability implementation. Not domain. |
| Adapter | Vendor runtime hidden behind a small interface. |
| Capability | Small platform contract (clipboard, share, notifications, …), implemented per runtime. |
| Barrel | Re-export wrapper that hides the defining file. Forbidden. |
| Minimal monolith | Few meaningful packages, shallow graph, no package-per-folder. |
| Evidence, not authority | Current code informs the audit; the architecture decides what stays. |
