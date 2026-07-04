# Ownership And Dependencies

Repository ownership, package identity, dependency flow, and core runtime ownership.

## Repository Ownership

| Path | Ownership |
| --- | --- |
| `apps/*` | Platform-specific applications and UX surfaces (dashboard, desktop, mobile, server, web, www) |
| `packages/*` | Shared TypeScript contracts, domain modules, platform services, and tooling |
| `runtimes/*` | Protocol/runtime adapters and runtime-integration boundaries |
| `crates/*` | Rust-native networking and system-level components |
| `docs/` | First-party repository and product documentation |
| `skills/` | Agent-facing repository standards and workflows |

Directory names and manifest package names must agree. Duplicate workspace
package names are invalid. Treat a mismatch such as a `packages/core` manifest
named `@rahrow/cli` as a scaffold defect to fix, not an established identity.
Every package and app has a `README.md` describing its purpose, owned behavior,
and current implementation status.

Publishability is package-specific and must follow explicit release policy.
Do not assume every workspace package is public.

Do not add a top-level owner when an existing package or app already fits.
Within an owning package, prefer responsibility-based names such as `config.ts`
and `Config` over product-prefixed names such as `rahrowConfig.ts` and
`RahRowConfig`. Reserve the RahRow name for public identity and protocol
surfaces such as package names, the CLI command, `rahrow.config.ts`, and
`.rahrow/`.

RahRow development should respect these boundaries across apps, packages,
runtimes, and crates.

## Dependency Flow

The intended dependency direction is:

```text
apps/*
  |
packages/*
  |
runtimes/*
  |
crates/*
```

Rules:

- Shared contracts should not depend on higher-level app surfaces.
- Runtime adapters may depend on shared contracts/utilities but should not depend on app presentation layers.
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
packages/* shared contracts and domain APIs
  |
runtimes/* protocol/runtime adapters
  |
crates/* native networking and systems capabilities
```

Core owns behavior such as:

- shared contract validation and compatibility guardrails
- domain-level orchestration and runtime abstractions
- deterministic transformations and boundary-safe data exchange
- diagnostics, health, and telemetry integration hooks
- package-level interoperability across apps and runtimes

Interfaces own input, rendering, transport, and user interaction. They call core
operations rather than reproducing these rules.
