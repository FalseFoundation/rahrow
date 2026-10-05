# RahRow Architecture Rules

## Repository Shape

Target top-level areas are `apps/`, `packages/`, `engines/`, `scripts/`, root tool config, and focused root docs. This is a boundary map, not permission to create empty packages.

Prefer the minimum number of meaningful boundaries. If two areas are tightly coupled and have one consumer, keep them together until extraction reduces coupling or prevents duplication.

Expected apps:

- `apps/cli`: Node.js + TypeScript. No Tauri. Reuses core/application capabilities.
- `apps/desktop`: React + Vite + Tauri 2. Rust exists only for native access and process/platform integration.
- `apps/mobile`: React + Vite + Capacitor. Kotlin/Swift exist only for Android VPN APIs, iOS Network Extension, Xray integration, and platform capabilities.

Expected packages when justified:

- `packages/core`: domain concepts and orchestration.
- `packages/protocols`: VLESS, VMess, Trojan parsing/serialization/normalization.
- `packages/engine`: engine contract and Xray adapter.
- `packages/features`: shared frontend feature behavior, hooks, feature models, state adapters, and reusable feature-level components when reused by multiple frontend apps.
- `packages/subscriptions`: fetch/decode/parse/normalize subscription sources.
- `packages/platform`: small platform capability contracts.
- `packages/storage`: local profile/settings persistence if separate abstraction is justified.
- `packages/ui`: intentionally small shared UI primitives.
- `packages/tooling`: shared config helpers.

## Dependency Direction

Keep the graph shallow:

```text
applications -> core -> protocols / engine / storage / subscriptions
applications -> features -> core / protocols / subscriptions / engine / storage
applications -> features -> ui
applications -> ui
engine -> Xray implementation
```

Never allow `core` to depend on React, UI, Tauri, Capacitor, Vite, browser APIs, Node-specific APIs, or native mobile APIs.

Never allow `packages/features` to depend on desktop, mobile, Tauri, Capacitor, native APIs, app-private files, or route-specific app composition.

## Core Domain

`packages/core` owns application domain concepts and orchestration. It must be usable from CLI, desktop, mobile, tests, and future apps.

Initial domain concepts:

- `ConnectionProfile`
- `Protocol`
- `Endpoint`
- `Transport`
- `Security`
- `Subscription`
- `Connection`
- `Engine`
- `LatencyResult`
- `Settings`

Keep models minimal. Model what RahRow needs, not every possible Xray configuration field. Engine-specific details belong to engine adapters.

Prefer a composed profile shape:

```ts
type ConnectionProfile = {
  protocol: Protocol;
  endpoint: Endpoint;
  transport?: Transport;
  security?: Security;
  authentication?: Authentication;
  metadata?: ProfileMetadata;
};
```

Do not create inheritance hierarchies such as `BaseProfile -> VlessProfile -> VmessProfile -> TrojanProfile`.

## Protocol, Import, Export, and Subscription

Initial protocols are VLESS, VMess, and Trojan. Implement protocol-specific behavior through small parsers, serializers, validators, and normalizers composed through a registry/pipeline.

Parser shape:

```ts
interface ConnectionParser {
  canParse(input: string): boolean;
  parse(input: string): ConnectionProfile[];
}
```

All imports converge into one pipeline:

```text
Input -> Decode -> Detect -> Parse -> Normalize -> Validate -> ConnectionProfile
```

Input sources include direct URLs, subscription URLs, clipboard, manual entry, shared URL, QR code, and future files. Do not implement separate profile creation logic per input method.

Exports follow:

```text
ConnectionProfile -> Serializer -> Protocol URL -> Clipboard / Share / QR
```

QR, clipboard, and sharing are transports/capabilities. They must not contain protocol logic.

Subscriptions are data sources, not connection types:

```text
Subscription URL -> Fetch -> Decode -> Parse -> Normalize -> Validate -> ConnectionProfile[]
```

Subscription code must not depend on React, Tauri, Capacitor, or Xray.

## Engines and runtimes

`packages/engine` exposes a small engine contract:

```ts
interface ProxyEngine {
  readonly id: string;
  start(input: EngineStartInput): Promise<void>;
  stop(): Promise<void>;
  restart(input: EngineStartInput): Promise<void>;
  status(): Promise<EngineStatus>;
  test(profile: ConnectionProfile): Promise<LatencyResult>;
}
```

Initial production implementations are `XrayEngine` and `SingBoxEngine`; future
engines may include Mihomo or focused tunnel adapters. The rest of RahRow
depends on `ProxyEngine`, not an engine implementation directly.

RahRow's first production engine set is Xray plus sing-box. Both are selected
through the same engine registry and persisted setting. Engine switching is a
product capability, not a developer environment toggle. An active process keeps
ownership of its connection until stopped; a new selection applies only through
a deliberate disconnect/reconnect transition.

Production artifacts must bundle every advertised engine. Desktop uses pinned,
checksummed Tauri sidecars. Android uses pinned AAR/JNI libraries and Apple
platforms use pinned XCFrameworks inside the app and Network Extension. Explicit
environment paths are development overrides only. Release applications must not
search `PATH`, require users to install cores, or fetch executable code on first
launch.

Do not expose engine JSON to UI. Each engine adapter owns its config generation,
validation, and process lifecycle. Keep shared lifecycle files and symbols named
for `Engine` or `Proxy`; use `Xray` or `SingBox` only for code that is genuinely
specific to that runtime. For Xray:

```text
ConnectionProfile -> XrayConfigBuilder -> Xray configuration -> Xray process
```

Treat Xray as an external runtime:

- Desktop: Tauri sidecar.
- CLI: Node-managed process.
- Mobile: Capacitor to native VPN implementation to Xray runtime.

Xray's native `tun` inbound is the engine-facing TUN contract. Desktop may use
`autoSystemRoutingTable` and `autoOutboundsInterface` only where the platform
adapter restores routing safely. Mobile Network Extension/VpnService providers
own the tunnel descriptor and pass it to Xray as `xray.tun.fd`; Xray must not
open an unrelated tunnel. An adapter that cannot prove descriptor injection,
socket exclusion, route and DNS cleanup, packaged-runtime availability, and
device lifecycle behavior is unavailable and fails closed. Android therefore
keeps its temporary sing-box-only product capability gate until the dedicated
Xray adapter passes packaged-runtime and installed-device verification.

Do not embed Go into Rust or create FFI unless real mobile/OS requirements force it.

## Product protocol target

The shipped baseline is VLESS, VMess, and Trojan with subscription links, TLS,
REALITY, VLESS Vision, uTLS, and supported V2Ray transports. The committed
expansion target is Shadowsocks, Hysteria/Hysteria2, SSH, and V2Ray JSON import.
Ping Tunnel and DNS tunnel/DNSTT require separate engine or transport adapters;
do not force them into Xray or sing-box configuration models.

Treat "V2Ray" as an ecosystem/configuration and subscription format rather than
a protocol name. Shadowsocks support includes modern AEAD methods:
`aes-128-gcm`, `aes-192-gcm`, `aes-256-gcm`,
`chacha20-ietf-poly1305`, and `xchacha20-ietf-poly1305`. Keep legacy methods out
of the default UI unless compatibility evidence justifies them.

A capability becomes "supported" only when the profile schema, validation,
parser/serializer or JSON importer, at least one engine config builder, shared
UI workflow, malformed-input coverage, and an integration seam are complete.

## Connection, Diagnostics, and Storage

Core owns connection lifecycle states:

- `Disconnected`
- `Connecting`
- `Connected`
- `Disconnecting`
- `Error`

Avoid scattering connection state across UI components.

Initial diagnostics are latency/reachability only. Do not call it speedtest. Use `test(profile): Promise<LatencyResult>`.

Use local persistence, not a database server. Define minimal store interfaces where useful:

```ts
interface ProfileStore {
  list(): Promise<ConnectionProfile[]>;
  get(id: string): Promise<ConnectionProfile | null>;
  save(profile: ConnectionProfile): Promise<void>;
  remove(id: string): Promise<void>;
}
```

Use Zod when reading persisted data. Treat persisted data as untrusted input.

## Platform Capabilities

Create small capability contracts instead of one giant `PlatformService`. Examples:

- Clipboard
- Share
- QR scanning
- QR generation
- Notifications
- Autostart
- System proxy
- VPN
- File picker

Each runtime implements only the capabilities it supports.

VPN/TUN is the persisted default connection mode. Android must register and run
through `VpnService`; Apple platforms require a signed Network Extension packet
tunnel provider. Desktop platforms require their real OS tunnel provider or
equivalent native integration. Creating a local SOCKS inbound does not establish
a VPN.

System proxy is an explicit fallback mode. Activate it only inside the connection
lifecycle after the selected engine is ready, roll the engine back if activation
fails, and restore the previous OS proxy state on disconnect. Never silently
fall back from VPN to proxy when VPN permission, entitlement, extension, or
runtime support is unavailable.

## Apps, Features, and Shared UI

RahRow uses FBA for frontend work. Frontend domains may be called features. Application-local features are the default:

```text
apps/desktop/src/features/*
apps/mobile/src/features/*
```

Keep each feature/module/domain in its own file architecture. Features may intentionally refer to or use neighboring features through clear public exports, route/app composition, shared domain contracts, shared UI primitives, platform capabilities, or extracted package APIs. Do not merge multiple feature architectures into one catch-all directory.

Frontend interface files must not become the owner of product workflows. Screen and component files should mainly render, compose UI primitives, and bind events. Put reusable behavior in named hooks, pure feature model files, TanStack Store/Query/Form integrations, platform capability adapters, or lower-layer packages. Treat large components that own persistence, protocol import/export, platform calls, engine testing, selection state, subscriptions, and rendering at once as refactor targets.

Extract to a package when logic is used by multiple applications, independently testable/reusable, has a meaningful public API, prevents duplicated logic, or reduces coupling.

Use `packages/features` for the product UI that desktop and mobile both present: app-facing hooks, feature models, shared state adapters, reusable feature-level components, shared screens, and colocated CSS Modules. Pure profile, protocol, subscription, engine, storage, and connection behavior belongs in its owning package instead. Native capability implementations, app bootstrap, and platform chrome stay in `apps/*`.

Shared UI primitives belong in `packages/ui` as the Shadcn-style `@rahrow/ui` system. Desktop and mobile should use it heavily. When a repeated primitive need appears, introduce the variant, design token, or primitive in `packages/ui`, then consume it from features/apps.

Feature screens and composed feature components must use colocated CSS Modules (`Component.module.css` next to `Component.tsx`) for layout and composition. Do not style feature UI with global CSS, duplicated app stylesheets, or Tailwind utility soup in feature files. `@rahrow/ui` owns primitives and tokens; feature CSS Modules own feature layout.

Desktop and mobile product UI must look identical: same screens, routes, layout, typography, spacing, visual hierarchy, and interaction chrome. Do not maintain a separate desktop or mobile visual design. Platform chrome such as tray, system bars, and VPN permission sheets may differ; in-app UI must not.

## State and UI Scope

Main product interface is connection-oriented.

Core screens/features:

- Home
- Profiles
- Subscriptions
- Import
- Diagnostics
- Settings

Home prioritizes current connection, connection state, Connect/Disconnect, current profile, latency, and quick profile selection.

Profile management should support add, edit, duplicate, delete, import, export, share, QR, and test.

Import should support URL, clipboard, QR, shared URL, subscription, and manual input.

Use React state for local UI state. Use TanStack Store for centralized reactive client state, TanStack Query for remote/server-like async state, and local storage abstractions for local persistence.

Use TanStack Forms for complex profile/configuration forms.

Use TanStack Router for frontend routing, TanStack Hotkeys for meaningful keyboard commands, TanStack Virtual for large lists, and TanStack Pacer for throttling/debouncing workloads such as subscription refreshes, repeated latency tests, search, and filtering.

## Ads and Optional Capabilities

Ads must not exist in `packages/core`, protocol packages, `packages/engine`, subscriptions, or storage. Ads are optional application capability and must never contaminate domain, protocol, engine, or storage logic.

Create `packages/ads` only when actually implementing ads. RahRow must remain fully functional without an advertising provider.

Optional capabilities such as ads, additional engines, additional protocols, advanced routing, cloud sync, analytics, and telemetry come only after the core product works and should be introduced independently.

## Tooling and Docs

Use Turbo for app and package tasks. The current script vocabulary is `dev`, `build`, `test`, `watch`, `lint`, `format`, `check`, `cleanup`, `update-deps`, `update-engines`, and package-level `typecheck`. Use `watch` for persistent TypeScript watch tasks. `update-deps` also refreshes pinned Xray and sing-box releases. Repo-wide Biome and root pnpm commands stay direct. Source-exported packages use a `transit` task instead of `^build`, `^typecheck`, or `^test`.

Root scripts should delegate to `turbo run <task>` where the task can live in packages. Package scripts own package-specific implementation. Use Vitest for tests.

Use Taskset for planning and task state. Use Changesets for changes that affect published packages, package APIs, or release notes. Do not duplicate Turbo and Taskset responsibilities.

Shared TypeScript config belongs in `packages/tooling` when useful. Keep variants minimal: base, react, node, and Tauri-specific only where needed.

Root docs should stay focused: `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CODE_OF_CONDUCT.md`, and `LICENSE`. Do not create README/CHANGELOG/AGENTS files for every tiny directory.
