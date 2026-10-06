---
name: rahrow-implement
description: Implement, migrate, review, or design RahRow as a production-ready, multi-engine VPN and proxy client; use for large architecture migrations, app/package refactors, protocols, engines, storage, UI, testing, release packaging, or tooling work.
---

# RahRow Implement

Use this skill whenever working in the RahRow repository on implementation, migration, refactoring, reviews, tests, dependency choices, package boundaries, frontend features, or product architecture.

When the request says to apply RahRow architecture, migrations, best practices, or this skill over packages/apps, interpret it as a structural architecture pass. Do not satisfy it with only small type fixes, validation additions, test additions, or local hardening.

The architecture plan is the source of truth. Existing implementation inside `apps/*`, `packages/core`, or `packages/engine` is evidence, not authority; keep or extend it only when it matches these rules.

## North Star

RahRow is a minimal, clean, composable, scalable open-source multi-engine VPN and proxy client monorepo. Xray and sing-box are its initial engines, but future engines must not require rewriting the domain, UI, profile model, or application architecture.

The target is a small local application first:

- RahRow ships as one self-contained, user-facing application per OS. A release
  artifact bundles every advertised engine, provider, helper, asset, and runtime;
  users never install proxy cores or other local dependencies separately and the
  app never downloads executable code on first launch.
- A platform release is delivered as one native application artifact such as an
  installer, `.app` bundle, APK, or IPA. Platform-required services, drivers,
  sidecars, system extensions, app extensions, or native libraries may live
  inside that artifact; "one application" does not require one filesystem binary,
  one OS process, unsafe FFI, or bypassing the platform security model.
- Xray and sing-box are first-class bundled engines. Users can select a
  compatible engine through the shared Settings experience without reinstalling.
- VPN/TUN is the default connection mode and must use the platform's registered
  VPN facility. System proxy is an explicit fallback, never a silent substitute
  for an unavailable tunnel. Unsupported tunnel builds fail closed and explain
  which native entitlement, extension, library, or permission is missing.
- CLI, desktop, and mobile share reusable TypeScript domain/application logic.
- Desktop uses React + Vite + Tauri 2 with minimal Rust at the native edge.
- Mobile uses React + Vite + Capacitor with native Android/iOS VPN integrations only at the platform edge.
- Xray is an engine adapter/runtime, not the domain model.
- Xray VPN uses its native `tun` inbound. Desktop may use its system-routing
  options; mobile providers inject the OS-owned descriptor through
  `xray.tun.fd`. Keep a platform unavailable until that adapter, packaged
  runtime, routing cleanup, and installed-device lifecycle are verified.

Optimize for clarity, composability, correctness, and future extension without foundation rewrites.

## Single-Application Distribution Contract

Treat the one-application-per-OS vision as a product invariant, including for
development previews:

- The downloaded application artifact contains everything needed for every
  capability it advertises. Do not require Homebrew, a system package manager,
  separately installed engines, language runtimes, command-line tools, PATH
  configuration, privileged setup scripts, or first-run executable downloads.
- Embedded platform components are owned by the application lifecycle. The app
  installs or activates them through supported OS facilities and updates,
  deactivates, and removes them without leaving orphaned services, drivers,
  extensions, routes, DNS state, or engine data.
- Normal OS consent, VPN permission, administrator authorization, signing,
  entitlement, and system-extension approval prompts are allowed; they are
  platform security requirements, not external dependencies.
- Development overrides may point to local engines or unsigned components for
  contributor testing, but they must remain optional. The preview artifact should
  exercise the eventual bundled layout, and release code must never depend on the
  override.
- If a capability cannot be bundled and operated under this contract on a target
  OS, mark it unavailable and fail closed. Do not silently substitute proxy mode
  for VPN/TUN or advertise a partially external setup as built in.
- Android must retain the temporary sing-box-only advertised VPN capability
  until its dedicated Xray file-descriptor adapter passes packaged-runtime and
  physical-device verification.

## Non-Negotiables

- Composition > Inheritance.
- Use DDD where it clarifies domain language, aggregates, value objects, and boundaries; do not turn DDD into ceremony.
- Use FBA for frontend code: app-facing domains are organized as `features`, and each feature owns its local UI, CSS Modules, state, hooks, and app orchestration until shared extraction is justified.
- Keep desktop and mobile product UI identical. Shared screens, layout, typography, spacing, visual hierarchy, and feature composition live in `packages/features`. `apps/desktop` and `apps/mobile` are thin shells for platform bootstrap, native capability wiring, and entry points. Do not maintain a separate visual design, layout, or screen structure per app. Platform chrome such as tray, system bars, and VPN permission sheets may differ; in-app UI must not.
- Style feature UI with colocated CSS Modules (`*.module.css`). `@rahrow/ui` owns primitives and tokens; feature CSS Modules own feature layout and composition. Do not style feature screens with ad hoc global CSS, duplicated per-app stylesheets, or Tailwind utility soup in feature files.
- Keep frontend feature logic separated from final interface components. Components should primarily render and compose; feature behavior, workflows, state transitions, async orchestration, and derived data belong in named hooks, feature models, stores, command/query helpers, or lower-layer package APIs.
- Use lightweight TDD for critical behavior.
- Apply SOLID through small interfaces, explicit dependencies, and dependency inversion.
- Keep a minimal monolith with a shallow dependency graph.
- Taskset is RahRow's default task manager and the canonical source of truth for persistent repository work. Use the installed `taskset` skill and Taskset CLI for planning, tracking, and task status; do not introduce or maintain a parallel task store.
- Keep reusable domain logic and application capabilities out of platform-specific apps.
- Put platform implementations at the edges.
- Hide engine implementations behind interfaces.
- Keep a truthful engine/protocol capability matrix. Never advertise a protocol
  merely because an embedded runtime supports it; RahRow support requires the
  domain schema, import/export path, engine mapping, UI path, and tests.
- Do not create barrel or compatibility export files such as `index.ts`, `platform.ts`, `profiles.ts`, `protocols.ts`, `schemas.ts`, or similar wrapper files. Export symbols only from the files that define them, and import exact files directly where they are used.
- Package export maps should expose source files with `"./*": "./src/*"` instead of listing each public file or folder one by one.
- Avoid premature abstraction, empty packages, package-per-folder architecture, and framework-driven architecture.
- Do not duplicate business logic between CLI, desktop, and mobile.
- Do not duplicate reusable frontend feature logic between desktop and mobile. Extract shared app-facing feature code to `packages/features` when it is actually reused and has a clear API; keep pure domain/application behavior in `packages/core`, `packages/protocols`, `packages/subscriptions`, `packages/engine`, `packages/storage`, or another owning lower-level package.
- Do not add a backend, database server, object storage, message broker, cache, OpenAPI layer, unnecessary Rust/native code, or unnecessary libraries.
- Do not optimize for hypothetical scale.

## Stack Rules

Use TypeScript, PNPM, Turbo, Biome, Taskset, Changesets, Vite, Zod, React, Vitest, Tauri 2 for desktop, and Capacitor for mobile. Taskset is the default task manager; use the repository-local CLI (`pnpm exec taskset`, with `pnpm taskset` as the accepted shortcut) and follow the installed `taskset` skill whenever repository tasks are inspected or changed.

`@rahrow/ui` is the shared Shadcn-style UI system used by frontend apps. Add new variants, tokens, and reusable primitives inside `packages/ui` when app UI needs them, then consume them from desktop/mobile instead of duplicating styling. Feature screens and composed feature components must use CSS Modules for their own layout and composition, even when they consume `@rahrow/ui` primitives.

Use TanStack libraries when their domain is present: Router for routing, Query for remote/server-like async state, Form for complex forms, Store for genuinely shared client state, and Virtual for large lists. Add Pacer only for measured scheduling pressure, Hotkeys for discoverable desktop keyboard commands, and DB only when indexed persistence plus live queries are justified. Treat this as an adoption guide, not a dependency checklist; do not build ad hoc alternatives when an adopted TanStack library already owns the concern.

Apply these TanStack data and performance rules:

- **[Virtual](https://tanstack.com/virtual/latest):** Keep the scroll surface, semantic markup, focus behavior, and visual
  states owned by RahRow UI. Render only visible rows plus intentional overscan,
  use stable domain keys, and measure dynamic rows rather than assuming fixed
  heights. For uniformly sized connection rows, prefer stable `estimateSize`
  values (encode known padding in the estimate) instead of `measureElement`;
  zero-height measurements expand the visible range to the full loaded window
  and can livelock React when combined with progressive paging. Cap extracted
  index ranges and page only when the scroll viewport has a real height. Choose
  an element or window virtualizer to match the product's real scroll owner; do
  not add a nested scroll area merely to simplify virtualization. Use a custom
  range extractor for sticky group rows. For prepends, streaming content, or
  route restoration, preserve a stable anchor and restore a validated snapshot
  with its scroll offset and compatible measurement cache. Large local
  collections should progressively expose pages as the user nears the end
  without putting every record in the React tree. Cover large-list regressions
  with Vitest against the real virtualizer, not only mocks.
- **[Pacer](https://tanstack.com/pacer/latest):** Select the pacing primitive from the work contract: debounce work
  that may wait for quiet, throttle high-frequency work that still needs regular
  progress, rate-limit externally constrained operations, queue work that needs
  concurrency or ordering, and batch work that can be grouped. Observe pacing
  state when the UI needs pending or execution feedback. Async work must define
  retry and abort behavior; queues must define concurrency and ordering. Use the
  renderer adapter only at renderer boundaries and keep the underlying policy
  framework-agnostic when it is shared.
- **[Query](https://tanstack.com/query/latest):** Treat remote and server-like async data as server state, not global
  client state. Use domain-shaped query keys and colocate query functions with
  their domain adapters. Model initial loading, error, empty, stale-data, and
  background-refetch states explicitly. Use optimistic mutations where they
  improve continuity, include rollback behavior, and invalidate only affected
  query keys after writes. Use infinite queries when the remote API owns page
  cursors; do not substitute client slicing for a server pagination contract.
- **[DB](https://tanstack.com/db/latest):** Add typed collections only when live cross-collection queries, indexed
  persistence, or normalized optimistic data justify the extra layer. An
  existing REST or TanStack Query flow should adopt collections first, then add
  on-demand query-driven synchronization only when the backend can support it.
  Collection mutations require optimistic persistence and rollback. Local JSON
  settings and bounded UI snapshots do not justify TanStack DB by themselves.
- **[Store](https://tanstack.com/store/latest):** Keep the core store framework-agnostic, update state immutably, use
  derived stores for computed state, and batch related writes. Renderer code
  must select the smallest useful slice with `useSelector` so unrelated changes
  do not rerender large screens. Store owns shared client/session state; durable
  persistence still passes through RahRow's storage boundary, and server data
  remains in Query or DB collections.

Do not introduce Decimal.js, NestJS, Prisma, MongoDB, S3, MinIO, RabbitMQ, NATS, Redis, OpenAPI, Next.js, React Native, or Expo for the initial client architecture.

## Product UX Invariants

Treat the product interface as one coherent connection client, not a collection
of independently designed screens:

- Dark is the initial theme. Use a static semantic background instead of a
  shaded or decorative backdrop.
- Connection state is a theme input: the provided neutral Shadcn palette is the
  default while disconnected or transitional, and the primary semantic color
  becomes blue only while connected. Drive this through one document-level
  semantic state such as `data-connection-state`; remap shared OKLCH tokens so
  buttons, focus treatments, badges, navigation, and other primitives cannot
  drift into component-specific state colors.
- Home, Connections, and Settings share one app shell, header language, search
  treatment, safe-area policy, and primary navigation. Nested pages use a
  consistent back affordance instead of repeating the root tab bar or linking
  Settings from every header.
- Show capabilities only when the current platform supports them. Inject
  platform capability metadata; do not render unavailable controls as permanent
  disabled rows. Native detection and implementation stay at app edges.
- Empty states fill the available content region, center both axes, use an
  appropriate project icon, and offer the next useful action. Omit incidental
  status labels when there is no meaningful entity or operation to report;
  feature models decide whether status data is meaningful before screens render
  it.
- Add and Import are one connection workflow presented by an accessible drawer
  with QR, URL, and Manual modes. QR consumes an injected camera surface, URL
  includes a paste affordance, and Manual chooses profile type and protocol
  before rendering protocol-owned fields.
- Standalone profiles and subscriptions are different aggregates. A profile
  imported from a subscription remains owned, persisted, and displayed under
  that subscription; it must not also appear as a standalone profile.
- The canonical `ConnectionProfile` is the editable and persisted connection
  truth. Share URLs may round-trip semantically through that model, while
  engine configurations are one-way compiled output. Treat complete Xray or
  sing-box JSON as a separate raw-document workflow; extracting a profile must
  report lossy or unsupported fields instead of silently discarding DNS,
  routing, inbounds, policies, or additional outbounds.
- Export and share use one app-global drawer that accepts content, displays a
  real QR, and exposes copy, system-share, and QR-download actions. A
  subscription shares its original source URL by default; expanding all child
  profiles is an explicit lazy action because it can be expensive.
- Diagnostics belongs to the App settings category and presents useful bounded
  application logs. Hide log actions the platform cannot perform.
- Generate native app icons from the official white RahRow artwork on a static
  high-contrast background unless a platform-specific appearance variant is
  explicitly supported and verified.

## Architecture References

Read only the references needed for the current work:

- For broad commands such as "apply RahRow migrations and architecture over packages/core, packages/engine, then apps/*", read [references/large-migration-mandate.md](references/large-migration-mandate.md) first, then load the other relevant references.
- For package boundaries, domain models, protocol/import/export/subscription flows, engine/runtime contracts, platform abstractions, UI scope, state, routing, forms, ads, dependencies, and documentation rules, read [references/architecture.md](references/architecture.md).
- For migration sequencing and repository restructuring decisions, read [references/migration.md](references/migration.md).
- For tests, TDD expectations, security-sensitive input handling, and completion criteria, read [references/testing-and-done.md](references/testing-and-done.md).
- For naming, file organization, scripts, Taskset/Changesets usage, and installed skill coordination, read [references/workflow-and-conventions.md](references/workflow-and-conventions.md).
- For feature-based architecture, modular/domain isolation, and good/bad structure examples, read [references/modularity-examples.md](references/modularity-examples.md).

## Implementation Posture

Before coding, identify which layer owns the behavior: domain, protocol, subscription, engine adapter, storage, platform capability, frontend feature, shared UI, or tooling. Keep edits in that layer unless a real dependency boundary requires a small companion change.

Treat the rules in this skill and its references as mandatory repository standards, not optional advice. If existing code violates them, do not copy the violating shape into new work. Either fix the local violation as part of the change when scope allows, or state the violation and keep the new code aligned with the target architecture.

Prefer starting product screens in `packages/features` when desktop and mobile should share them, which is the default. Keep `apps/*/src/features` only for genuinely platform-unique composition. Extract domain logic to lower packages; do not duplicate screens. A concept being important is not enough reason to create a new package.

For frontend features, separate product behavior from final interface files before the component grows into a workflow owner:

- Final interface components such as screens, panels, dialogs, and cards should mainly compose UI, wire event handlers, and present state.
- Hooks own React state, effects, memoized derived state, and app-facing command handlers such as import, export, duplicate, delete, refresh, share, and test.
- Feature model/helper files own pure transformations, selection rules, validation adapters, payload builders, and message/status derivation.
- TanStack Store owns shared client state; TanStack Query owns server-like async state; TanStack Forms owns complex form state; do not rebuild those concerns with ad hoc state trees.
- Platform capability calls must be injected through a capability boundary or hook input instead of being scattered directly through presentational components.
- A component file that constructs stores/registries/engines, performs persistence, calls platform APIs, handles protocol import/export, and renders a full screen is a refactor target. Extract behavior into an owning hook, feature model, or lower package before extending it.

Use `packages/features` as the shared frontend feature layer for product UI that desktop and mobile both present. Desktop and mobile must look the same, so shared screens, hooks, feature models, CSS Modules, and reusable feature components belong here by default:

```text
apps/* -> packages/features -> packages/core / packages/protocols / packages/subscriptions / packages/engine / packages/storage
apps/* -> packages/features -> packages/ui
apps/* -> packages/ui
```

`packages/features` must not depend on desktop, mobile, Tauri, Capacitor, native APIs, or app-private files. Keep native capability implementations and app bootstrap in `apps/*`. Shared routes, screens, and CSS Modules stay in `packages/features` so the two apps cannot drift visually. Do not create a root-level `features/` directory or an empty `packages/features` umbrella.

When uncertain, choose the minimum meaningful boundary and leave the code easy to move later.

For a large migration request, do not shrink the task to a small local patch. Build a repo-level plan, audit package/app boundaries and consumers, execute coherent refactor phases, verify each phase, and continue until the requested architecture pass is genuinely handled or a concrete blocker prevents progress.
