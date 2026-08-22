# Ownership And Dependencies

Repository ownership, package identity, dependency flow, and core runtime ownership.

## Repository Ownership

| Path | Ownership |
| --- | --- |
| `apps/desktop` | Tauri desktop application and desktop UX |
| `apps/mobile` | React/Vite/Capacitor mobile application and mobile UX |
| `apps/www` | Documentation website |
| `packages/core` | Shared TypeScript domain contracts, schemas, and ports |
| `packages/engine` | Proxy engine implementations behind core contracts |
| `packages/tooling` | Shared TypeScript, Vite, Tauri, React, docs, and formatting presets |
| `packages/ui` | Shared React UI primitives and global interface styles |
| `docs/` | First-party repository and product documentation |
| `skills/` | Agent-facing repository standards and workflows |

Directory names and manifest package names must agree. Duplicate workspace
package names are invalid. Treat a mismatch between directory and manifest
identity as a scaffold defect to fix, not an established alias.
Every package and app has a `README.md` describing its purpose, owned behavior,
and current implementation status.

Publishability is package-specific and must follow explicit release policy.
Do not assume every workspace package is public.

Do not add a top-level owner when an existing package or app already fits.
Within an owning package, prefer responsibility-based names such as `config.ts`
and `Config` over product-prefixed names such as `rahrowConfig.ts` and
`RahRowConfig`. Reserve the RahRow name for public identity and protocol
surfaces such as package names, the future CLI command, and app identifiers.

RahRow development should respect these boundaries across apps, packages,
engine packages, and platform-native code.

## Dependency Flow

The intended dependency direction is:

```text
apps/*
  |
packages/*
```

Rules:

- Shared contracts should not depend on higher-level app surfaces.
- Engine adapters may depend on shared contracts but should not depend on app presentation layers.
- Shared UI may depend on tooling and UI-specific utilities but must not own
  RahRow domain behavior.
- A client package must not become the domain API for another client.
- Apps may consume packages; shared packages must not depend on apps.
- Keep framework-specific DTOs and view models in the owning interface unless
  they are stable cross-interface contracts.
- Import workspace code through manifest exports and declare it with
  `workspace:*`.

If a browser or editor runtime cannot access the filesystem directly, introduce
a thin host adapter that delegates to core. Do not move domain rules into the
transport layer.

## Core Runtime Flow

```text
apps/* interfaces
  |
packages/core shared contracts and domain APIs
  |
packages/engine proxy engine adapters
  |
platform-native networking and systems capabilities, only when justified
```

Core owns behavior such as:

- shared contract validation and compatibility guardrails
- domain-level orchestration and runtime abstractions
- deterministic transformations and boundary-safe data exchange
- diagnostics, health, and telemetry integration hooks
- package-level interoperability across apps and engines

Interfaces own input, rendering, transport, and user interaction. They call core
operations rather than reproducing these rules.
