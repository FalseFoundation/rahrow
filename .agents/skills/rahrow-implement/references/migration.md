# RahRow Migration Workflow

Use this reference for repository cleanup, restructuring, or phased implementation work.

## Migration Principles

Do not blindly preserve existing structure. Inspect existing apps, packages, crates, runtime code, dependencies, scripts, configuration, and core implementation, then classify each piece as keep, move, merge, or delete.

Current implementation details in `apps/*`, `packages/core`, and `packages/engine` are not architectural authority. Keep code only when it aligns with the plan and is useful.

Avoid empty placeholders. Create packages, directories, configs, scripts, native code, and docs only when they immediately carry useful implementation or a meaningful boundary.

An architecture migration must address structure and ownership, not only correctness details. Type fixes, schemas, tests, injectable clocks, and validation improvements are useful only as part of a broader boundary pass unless the user explicitly asked for a small hardening task.

## Phases

1. Repository cleanup: identify obsolete packages, frameworks, services, scripts, dependencies, and duplicated logic.
2. Establish monorepo: create or normalize `apps/`, `packages/`, `engines/`, and `scripts/`; configure PNPM, Turbo, Biome, TypeScript, Taskset, Changesets, and Vitest; remove unused framework configuration and stale scripts.
3. Establish domain: implement minimal `ConnectionProfile`, `Protocol`, `Endpoint`, `Transport`, `Security`, `Subscription`, `Connection`, `Engine`, `LatencyResult`, and `Settings` with Zod validation.
4. Protocol layer: implement VLESS, VMess, and Trojan parse/normalize/serialize through a registry/pipeline.
5. Subscription layer: implement fetch/decode/parse/normalize using the same protocol parser registry.
6. Xray engine: implement `ProxyEngine`, `XrayEngine`, `XrayConfigBuilder`, and `XrayProcess`; isolate Xray-specific configuration.
7. Storage: implement local profile/settings persistence and validate persisted data with Zod.
8. Desktop: build React + Vite + Tauri with Xray sidecar, connection lifecycle, tray, autostart, clipboard, share, QR, and system integration; keep Rust minimal.
9. Mobile: build React + Vite + Capacitor with isolated Android VPN and iOS Network Extension integrations.
10. CLI: implement commands that reuse core, protocols, subscriptions, engine, and storage.
11. UI refinement: build the actual product UX without creating an enormous design system.
12. Optional capabilities: only after the core product works, add ads, additional engines/protocols, advanced routing, cloud sync, analytics, or telemetry independently.

Runtime distribution is not optional cleanup. Before a desktop or mobile target
is called production-ready, its build must bundle pinned engine artifacts and
verify them at the packaging seam. Host-provided runtime paths are development
escape hatches, not a shipping strategy.

## Package Extraction Rule

Start application features inside apps. Extract only the reusable layer:

- domain logic to core or a cohesive package
- protocol behavior to protocols
- engine behavior behind the engine contract
- platform-specific implementations to app/native edges
- reusable UI primitives to ui
- frontend app domains to app-local `features`

Do not force complete feature sharing when only underlying logic is reusable.

## Removal Targets

Remove or avoid initial use of Decimal.js, NestJS, Prisma, MongoDB, S3, MinIO, RabbitMQ, NATS, Redis, OpenAPI, Next.js, React Native, and Expo.

Remove backend, database, cache, message broker, object storage, multiple UI stacks, multiple state managers, Rust networking stacks, and duplicated application logic unless a current, concrete product requirement justifies them.
