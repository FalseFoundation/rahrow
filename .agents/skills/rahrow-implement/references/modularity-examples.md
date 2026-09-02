# Feature and Module Isolation Examples

Use these examples when shaping feature-based frontend code or modular domain/package boundaries. The examples are RahRow-specific. Do not copy unrelated project structures into RahRow.

## Core Rule

Each feature, module, or domain owns its internal file architecture. Keep neighboring feature/module/domain folders separate even when they intentionally collaborate.

Final interface components are not the place for most product logic. Keep screen/panel/card components focused on rendering and composition, then move feature behavior into named hooks, model files, store/query/form adapters, capability adapters, or lower-layer package APIs.

Allowed dependencies:

- app feature -> `@rahrow/core` domain contracts
- app feature -> `@rahrow/ui` primitives and design tokens
- app feature -> platform capability interfaces exposed by the app/runtime
- app feature -> explicit public API from an extracted package
- app feature -> neighboring feature public export when app composition genuinely needs it
- shared package -> lower-level domain contracts it explicitly owns

Avoid dependencies:

- feature -> another feature's private internals when a public export or shared owner is more appropriate
- core -> app, UI, Tauri, Capacitor, browser, Node, or native APIs
- protocol/domain module -> Xray internals unless it is the Xray adapter
- shared UI -> app feature code

If two features need the same reusable logic, extract the shared logic to the nearest meaningful owner instead of combining their directory structures.

## Good Frontend Feature Shape

```text
packages/features/src/
├── connection/
│   ├── components/
│   │   ├── ConnectionStatus.tsx
│   │   ├── ConnectionStatus.module.css
│   │   ├── ConnectButton.tsx
│   │   └── ConnectButton.module.css
│   ├── hooks/
│   │   └── useConnectionActions.ts
│   ├── connection-model.ts
│   ├── ConnectionPanel.tsx
│   └── ConnectionPanel.module.css
├── profiles/
│   ├── components/
│   │   ├── ProfileList.tsx
│   │   ├── ProfileList.module.css
│   │   ├── ProfileEditor.tsx
│   │   └── ProfileEditor.module.css
│   ├── hooks/
│   │   └── useProfileSelection.ts
│   ├── profile-management-model.ts
│   ├── Profiles.tsx
│   └── Profiles.module.css
└── subscriptions/
    ├── components/
    │   ├── SubscriptionList.tsx
    │   └── SubscriptionList.module.css
    ├── hooks/
    │   └── useSubscriptionRefresh.ts
    ├── subscription-model.ts
    ├── Subscriptions.tsx
    └── Subscriptions.module.css
```

Why this is good:

- Product screens live in `packages/features`, so desktop and mobile render the same UI.
- Each feature owns its UI, colocated CSS Modules, and hooks.
- Components render; hooks and model files own the reusable behavior and derived state.
- Cross-feature usage can go through exact public feature files, route/app composition, or package/domain APIs.
- React component files use PascalCase, CSS Modules match the component stem, hook files use camelCase, and ordinary TS files/directories use kebab-case.

## Bad Frontend Feature Shape

```text
apps/desktop/src/features/
├── profiles/
│   ├── components/
│   │   └── ProfileList.tsx
│   ├── hooks.ts
│   ├── helpers.ts
│   ├── types.ts
│   └── ProfileManagement.tsx
├── subscriptions/
│   ├── SubscriptionScreen.tsx
│   └── importsProfilesInternals.ts
└── shared/
    ├── everything.ts
    ├── service.ts
    └── utils.ts
```

Why this is bad:

- `subscriptions` depends on `profiles` internals instead of a public export or shared owner.
- Generic `shared`, `utils`, `helpers`, and `service` files hide ownership.
- Common logic has no clear domain owner.
- Screen components become workflow owners when they directly own persistence, protocol import/export, platform APIs, engine calls, selection state, subscriptions, and rendering.
- Neighbor features become coupled and hard to move.

## Good Shared Extraction

When desktop and mobile both need profile parsing or selection rules, extract domain logic to the owning package. Shared screens stay in `packages/features` so the apps look identical:

```text
packages/core/src/profile/
├── connection-profile.ts
├── profile-selection.ts
└── profile-selection.test.ts

packages/features/src/profiles/
├── ProfileList.tsx
├── ProfileList.module.css
└── useProfileSelection.ts

apps/desktop/src/main.tsx
apps/mobile/src/main.tsx
```

Why this is good:

- Shared behavior lives in the domain/application layer.
- Shared screens and CSS Modules live in `packages/features`.
- Desktop and mobile stay visually identical; apps only bootstrap platform capabilities.

## Reusable Frontend Feature Packages

When a frontend feature becomes reusable across desktop and mobile, extract by what is actually shared:

```text
packages/features/src/profiles/
├── components/
│   ├── ProfileList.tsx
│   └── ProfileList.module.css
├── hooks/
│   └── useProfileSelection.ts
├── profile-selection-model.ts
├── Profiles.tsx
└── Profiles.module.css
```

Use `packages/features` when the shared unit is a frontend feature: UI, CSS Modules, hooks, state adapters, and app-facing composition that desktop and mobile both present.

Use `packages/screens` only when the shared unit is genuinely a screen-level composition reused as a screen across apps. Prefer not to put domain logic there. Product screens that desktop and mobile both show belong in `packages/features`, not duplicated app folders.

Use `packages/modules` only for broad, mixed modules with a clear public API and stable boundary. It is more ambiguous than `features`, so avoid it unless the module is intentionally broader than frontend feature code.

Prefer domain-specific package names when the reusable boundary is not frontend UI:

```text
packages/protocols
packages/subscriptions
packages/engine
packages/storage
```

Do not create `packages/features`, `packages/screens`, or `packages/modules` as empty umbrellas.

## Bad Shared Extraction

```text
packages/profiles/
├── desktop-profile-screen.tsx
├── mobile-profile-screen.tsx
├── profile-store.ts
├── xray-profile-config.ts
└── profile-ads-slot.tsx
```

Why this is bad:

- UI, storage, Xray config, and ads are mixed into one package.
- Platform-specific screens moved too early.
- Xray and ads contaminate profile/domain boundaries.
- The package is named after a concept, but it has no clean public purpose.

## Good Modular Domain Shape

```text
packages/core/src/
├── connection/
│   ├── connection-state.ts
│   ├── connection-lifecycle.ts
│   └── connection-lifecycle.test.ts
├── profile/
│   ├── connection-profile.ts
│   ├── profile-schema.ts
│   └── profile-schema.test.ts
└── diagnostics/
    ├── latency-result.ts
    └── latency-result.test.ts
```

Why this is good:

- Domain language is explicit.
- Tests sit near behavior.
- Modules can evolve without knowing app or engine details.

## Bad Modular Domain Shape

```text
packages/core/src/
├── types.ts
├── utils.ts
├── constants.ts
├── xray-json.ts
├── desktop-storage.ts
└── react-context.tsx
```

Why this is bad:

- Domain ownership is unclear.
- Xray, desktop storage, and React leak into core.
- Generic files become dumping grounds.

## Dependency Fixes

When a feature needs a sibling feature's behavior:

- First ask whether the behavior belongs in `@rahrow/core`, `@rahrow/protocols`, `@rahrow/engine`, `@rahrow/ui`, or an app-level composition file.
- If it is app-only orchestration, move it up to the route/app layer and pass it down.
- If it is reusable domain behavior, extract it to the owning package with tests.
- If it is reusable UI, move a primitive or variant to `@rahrow/ui`, not the full feature screen.
- If a neighbor should use it, expose it intentionally from an exact owning feature file with a clear domain name.
- If it is truly private, keep it private.
