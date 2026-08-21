# Product And Source

Product direction and local source-of-truth rules.

## Product Direction

RahRow is a cross-platform, privacy-first V2Ray client platform. It starts with
the V2Ray/Xray ecosystem and keeps clean extension points for future proxy/VPN
engines.

Design for:

- one normalized profile model shared by desktop, mobile, future CLI, and tests
- VLESS, VMess, and Trojan first
- Xray as the initial engine behind `ProxyEngine`
- local-first profile and settings persistence
- import/export pipelines that converge on the same parser and serializer
- platform capabilities at the app edge
- no initial backend, database server, cache, queue, object storage, or remote API
- no duplicated domain logic between applications

Near-term work should prove profile validation, protocol URL parsing,
subscription parsing, Xray config generation, engine lifecycle, latency
probing, and local persistence before adding optional capabilities.

## Source-Of-Truth Model

Canonical user state is local profile and settings data owned by the running
client. The concrete storage location is platform-specific and must remain
behind storage ports such as `ProfileStore` and `SettingsStore`.

Rules:

- Treat persisted data as untrusted input.
- Validate reads with Zod before returning domain objects.
- Keep writes deterministic and failure-safe.
- Do not store protocol-specific clipboard, QR, or sharing behavior in storage.
- Do not expose Xray JSON as the UI or profile source of truth.
- Keep engine-specific configuration derived from normalized profiles.
- Any persisted format change must define validation, compatibility, migration,
  and failure behavior before implementation.
