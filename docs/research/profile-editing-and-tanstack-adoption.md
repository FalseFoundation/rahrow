# Profile editing, conversion boundaries, and TanStack adoption

Research date: 2026-08-30

## Decision summary

RahRow should keep a versioned, engine-neutral `ConnectionProfile` as the editable and persisted source of truth. Share URIs should parse into and serialize from that model. Xray and sing-box JSON should be generated one-way from the profile plus app policy by engine adapters.

A complete Xray JSON document is not another spelling of a single connection. It can contain logs, DNS, routing, policies, inbounds, many outbounds, statistics, and observatories. Xray documents this top-level shape explicitly, and an outbound itself has protocol, settings, transport, mux, and chaining concerns ([Xray configuration file](https://xtls.github.io/en/config/), [Xray outbound object](https://xtls.github.io/en/config/outbound.html)). Therefore:

- URL → canonical profile → URL can be reversible for the fields defined by that URI scheme.
- canonical profile → engine outbound/config can be deterministic, but is not generally reversible.
- full engine JSON → one canonical profile is inherently lossy unless the importer extracts exactly one supported outbound and reports every discarded field.
- full engine JSON editing should be a separate “raw engine configuration” feature, not the advanced tab of a connection-profile form.

The existing RahRow split is the right foundation: `connectionProfileSchema` validates the portable model, `ProtocolRegistry` owns URI parsing/serialization, and the Xray and sing-box builders compile it to engine-specific output. Extend those seams rather than persisting generated engine JSON.

## Why “convert any format into any other format” needs explicit limits

Share formats are federated specifications, not one universal schema:

- The Xray VLESS/VMess proposal defines a URL-shaped connection record and requires URL-encoded values; its fields map to one outbound’s protocol, transport, and security settings ([XTLS share-link proposal](https://github.com/XTLS/Xray-core/discussions/716)).
- Shadowsocks SIP002 defines its own `ss://` grammar and encoding rules, including plugin arguments and different requirements for AEAD-2022 credentials ([Shadowsocks SIP002](https://github.com/shadowsocks/shadowsocks-org/wiki/SIP002-URI-Scheme)).
- Hysteria 2 says its URI intentionally contains only essential server-connection information. It explicitly excludes client modes and bandwidth because those are client-local settings ([Hysteria 2 URI scheme](https://hysteria.network/docs/developers/URI-Scheme/)).
- Xray transport compatibility depends on the combination of protocol, transport method, and transport security; for example, REALITY is not valid with every transport ([Xray transport compatibility](https://xtls.github.io/en/config/transport.html)).

Even XTLS’s own libXray conversion API draws this boundary: Xray JSON input is treated as a node source, only root `outbounds` are retained, other root fields are ignored, and output contains only fields supported by its share links ([libXray API design notes](https://github.com/XTLS/libXray#api)). A RahRow conversion UI must surface this kind of loss instead of implying a perfect round trip.

### Recommended conversion result

Every parser or converter should return data plus a report:

```ts
type ConversionResult<T> = {
  value: T
  fidelity: 'lossless' | 'normalized' | 'lossy'
  warnings: Array<{
    path?: string
    code: string
    message: string
  }>
  unrepresentedFields: string[]
}
```

Definitions:

- `lossless`: parse → serialize → parse preserves the canonical semantic profile.
- `normalized`: semantically equivalent, but aliases, defaults, encoding, or query-parameter order changed.
- `lossy`: source information is not representable in the destination. Export needs a confirmation screen that lists the loss.

Unknown URI query parameters should be preserved in a namespaced `extensions` bag when safe. They must not be silently interpreted. Unknown full-config fields should remain only in the preserved raw document, not be copied into the canonical profile.

## Canonical profile model

Keep shared subobjects for endpoint, transport, security, authentication, and metadata, but move toward a discriminated protocol union as the editor grows. A protocol union makes invalid states harder to construct than one object with many optional fields.

```ts
type CanonicalProfile =
  | VlessProfile
  | VmessProfile
  | TrojanProfile
  | ShadowsocksProfile
  | Hysteria2Profile
  | SshProfile

type ProfileEnvelope = {
  schemaVersion: number
  profile: CanonicalProfile
  source?: {
    kind: 'share-uri' | 'xray-outbound' | 'sing-box-outbound'
    raw?: string
    extensions?: Record<string, string | string[]>
  }
}
```

The envelope needs migrations. Existing `configVersion` patterns in v2rayNG and v2rayN show why a stored connection model needs an independent version from an engine configuration ([v2rayNG `ProfileItem`](https://github.com/2dust/v2rayNG/blob/a1b45bbfb2a6b66f57219b25d0683323e5db8d2e/V2rayNG/app/src/main/java/com/v2ray/ang/dto/entities/ProfileItem.kt), [v2rayN `ProfileItem`](https://github.com/2dust/v2rayN/blob/af0eb9ed14638fa877d11c235e491442ec7ba215/v2rayN/ServiceLib/Models/Entities/ProfileItem.cs)).

Do not put app/runtime settings such as DNS, local SOCKS ports, TUN routing, log paths, traffic statistics, or device policy in `CanonicalProfile`. Xray places these in separate top-level modules, which confirms they belong to RahRow’s engine/app policy layer ([Xray configuration modules](https://xtls.github.io/en/config/)).

### Source-of-truth pipeline

```text
share URI ──parse──▶ canonical profile ──compile──▶ Xray outbound + app policy
       ▲                   │             └───────▶ sing-box outbound + app policy
       └────serialize──────┘

full Xray/sing-box document ──validate/preserve──▶ raw engine document
                    └─optional extract one outbound──▶ canonical profile + loss report
```

The compiler should validate against the selected engine after generating output. Xray’s own wrapper exposes configuration validation without starting an instance, and its share conversion validates parsed outbounds with the current Xray builder ([libXray `testXray` and conversion notes](https://github.com/XTLS/libXray#api)). Equivalent sing-box validation should use the bundled target version, because official engine schemas evolve.

## Schema-driven editor design

The V2Box screenshots are useful layout references, but the field list must come from RahRow’s protocol and engine capabilities rather than copying every item shown.

Recommended form structure:

1. Common: protocol, remarks, address, port.
2. Authentication: field labels and validators selected by protocol.
3. Transport: network first, then only fields valid for that network.
4. TLS / REALITY: shown only for valid protocol + transport combinations.
5. Advanced canonical JSON: the current profile model only, with schema validation and a diff preview before applying.
6. Raw engine configuration: separate screen, explicit target engine/version, engine validation, and no claim that it can export as a single URL.

This mirrors a proven pattern in v2rayNG: each protocol screen owns protocol-specific fields, while a base editor renders common, transport, and security sections conditionally ([v2rayNG VLESS editor](https://github.com/2dust/v2rayNG/blob/a1b45bbfb2a6b66f57219b25d0683323e5db8d2e/V2rayNG/app/src/main/java/com/v2ray/ang/ui/server/ServerVlessActivity.kt), [v2rayNG base editor](https://github.com/2dust/v2rayNG/blob/a1b45bbfb2a6b66f57219b25d0683323e5db8d2e/V2rayNG/app/src/main/java/com/v2ray/ang/ui/server/BaseServerActivity.kt)). Its base editor changes host/path/mode fields based on transport and changes TLS fields based on stream security instead of displaying an undifferentiated JSON form.

### Safety rules

- A protocol change must preview fields that will be cleared and require confirmation when data would be lost.
- Options must be the intersection of profile protocol, selected engine, transport, and platform capabilities. Unsupported choices should not be shown.
- `allowInsecure` stays per profile and should include a security warning. Hysteria’s official guidance warns that disabling verification alone enables MITM and recommends pinning when insecure mode is unavoidable ([Hysteria 2 TLS guidance](https://hysteria.network/docs/getting-started/Client/#tls)).
- Passwords, UUIDs, keys, subscription URLs, and raw configurations are secret-bearing. Mask by default; never include them in toasts, logs, analytics, test fixtures, or conversion reports.
- Advanced JSON changes need parse, schema validation, semantic diff, and engine compilation/validation before save.
- Save the canonical profile atomically. Raw file validation should use a temporary file and replace the live file only after validation.

Hiddify applies the last rule to raw profiles: it writes to a temporary path, parses/validates, updates metadata, and then persists; cleanup runs even on failure ([Hiddify profile repository](https://github.com/hiddify/hiddify-app/blob/276a7effb0046a039220a745022563740968c0b8/lib/features/profile/data/profile_repository.dart)). Hiddify also models remote profiles with their source URL separately from local profiles, preserving the subscription/source boundary ([Hiddify profile entity](https://github.com/hiddify/hiddify-app/blob/276a7effb0046a039220a745022563740968c0b8/lib/features/profile/model/profile_entity.dart)).

## Patterns found in the reference repositories

### v2rayNG

- Uses one versioned, engine-neutral-ish `ProfileItem` for protocol, endpoint, transport, TLS/REALITY, and metadata fields ([model](https://github.com/2dust/v2rayNG/blob/a1b45bbfb2a6b66f57219b25d0683323e5db8d2e/V2rayNG/app/src/main/java/com/v2ray/ang/dto/entities/ProfileItem.kt)).
- Centralizes common URI query parsing and serialization, then adds protocol-specific pieces in individual formatters ([format base](https://github.com/2dust/v2rayNG/blob/a1b45bbfb2a6b66f57219b25d0683323e5db8d2e/V2rayNG/app/src/main/java/com/v2ray/ang/fmt/FmtBase.kt), [VLESS formatter](https://github.com/2dust/v2rayNG/blob/a1b45bbfb2a6b66f57219b25d0683323e5db8d2e/V2rayNG/app/src/main/java/com/v2ray/ang/fmt/VlessFmt.kt)).
- Converts the stored profile to an engine outbound in a dedicated builder, then applies global policy such as mux separately ([outbound builder](https://github.com/2dust/v2rayNG/blob/a1b45bbfb2a6b66f57219b25d0683323e5db8d2e/V2rayNG/app/src/main/java/com/v2ray/ang/core/CoreOutboundBuilder.kt)).

Useful lesson: keep parser/serializer, editor model, and engine generation separate. Do not copy its flattened nullable model unchanged; RahRow’s schema can enforce stronger protocol unions.

### v2rayN

- Uses a versioned `ProfileItem`, keeps protocol- and transport-specific extras in separately serialized structures, and validates protocol invariants before use ([profile model](https://github.com/2dust/v2rayN/blob/af0eb9ed14638fa877d11c235e491442ec7ba215/v2rayN/ServiceLib/Models/Entities/ProfileItem.cs)).
- Dispatches each share scheme to a protocol formatter and returns unsupported formats explicitly ([format dispatcher](https://github.com/2dust/v2rayN/blob/af0eb9ed14638fa877d11c235e491442ec7ba215/v2rayN/ServiceLib/Handler/Fmt/FmtHandler.cs)).
- Tests export → import semantic round trips for representative protocols rather than comparing URL strings ([formatter tests](https://github.com/2dust/v2rayN/blob/af0eb9ed14638fa877d11c235e491442ec7ba215/v2rayN/ServiceLib.Tests/Fmt/FmtHandlerTests.cs)).
- Builds engine outbounds from the profile in an engine service, keeping runtime generation downstream of the stored node ([Xray outbound builder](https://github.com/2dust/v2rayN/blob/af0eb9ed14638fa877d11c235e491442ec7ba215/v2rayN/ServiceLib/Services/CoreConfig/V2ray/V2rayOutboundService.cs)).

Useful lesson: RahRow’s compatibility tests should assert canonical semantic equality and explicit warnings, not byte-for-byte URL equality.

### Hiddify

- Separates remote profiles (source URL and update metadata) from local profiles ([profile entity](https://github.com/hiddify/hiddify-app/blob/276a7effb0046a039220a745022563740968c0b8/lib/features/profile/model/profile_entity.dart)).
- Treats raw content as an artifact that must be staged and validated before persistence ([profile repository](https://github.com/hiddify/hiddify-app/blob/276a7effb0046a039220a745022563740968c0b8/lib/features/profile/data/profile_repository.dart)).
- Keeps deep-link/subscription-link parsing distinct from the stored profile content ([link parser](https://github.com/hiddify/hiddify-app/blob/276a7effb0046a039220a745022563740968c0b8/lib/utils/link_parsers.dart)).

Useful lesson: a subscription source URL is not the concatenation of its child nodes, and raw configuration lifecycle is different from manual connection editing.

### Xray/libXray

libXray is useful as a native Xray parser/validator boundary, but its README warns that the API is not stable and only targets the latest Xray release ([libXray stability notes](https://github.com/XTLS/libXray#note)). If RahRow adopts it, pin a tested version behind the Xray adapter and do not expose its types across core/domain packages.

## TanStack adoption matrix

RahRow already depends on Query, Form, Store, and Virtual. Query has an app provider, and Virtual is already used for logs. The next work should deepen these existing choices before adding more libraries.

| Library | Decision | RahRow use | Rationale and guardrails |
| --- | --- | --- | --- |
| Query | Adopt now | Subscription list/fetch/refresh, public-IP lookup, remote diagnostics, background indicators | Query provides async-resource caching, background refetch, targeted invalidation, mutation state, and cancellation. Configure `staleTime`, retry, and focus/reconnect behavior deliberately; the defaults treat cached data as stale and retry failures three times ([important defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults), [query invalidation](https://tanstack.com/query/latest/docs/framework/react/guides/query-invalidation)). Do not use it as the durable database. |
| Form | Adopt now | Subscription editor and protocol-driven connection editor | Form supports field/form validation, async validation, Standard Schema validators, and subscribed submission state ([validation guide](https://tanstack.com/form/latest/docs/framework/react/guides/validation)). Bind RahRow’s Zod schema and engine-capability validation; do not duplicate validation rules in JSX. |
| Virtual | Adopt now where measured | Logs and large flattened connection/profile lists | Virtual is headless and preserves RahRow markup while rendering only visible rows ([Virtual introduction](https://tanstack.com/virtual/latest/docs/introduction?from=reactVirtualV2)). Use stable IDs, measured variable rows, overscan, and accessible list semantics. Do not virtualize small lists. |
| Store | Limited pilot now | Global share-drawer payload/progress and similarly small client-only cross-route UI state | Store is intended for focused client signals and selected subscriptions, while its own guidance assigns async resources to Query and relational data to DB ([Store overview](https://tanstack.com/store/latest)). It is currently marked alpha; keep domain persistence and connection entities out of it. |
| Pacer | Later, targeted beta | Debounced search; concurrency-limited speed-test or refresh queues; batched progress updates | Pacer directly models debounce, throttle, rate limit, queue, and batch with observable pending state, but is currently beta ([Pacer overview](https://tanstack.com/pacer/latest/docs/overview)). Add it only when a concrete queue/debounce replaces hand-written timing code; do not use it merely to make a synchronous parser non-blocking. Heavy parsing still needs a worker/native boundary. |
| DB | Defer/prototype only | Possible future normalized local profile/subscription collections if profiling proves current persistence/querying cannot scale | DB adds normalized collections, live queries, and optimistic mutations over Query or sync engines ([DB overview](https://tanstack.com/db/latest/docs/overview)). RahRow already owns a local repository and platform persistence boundary; adopting DB now would create two authorities. Prototype only after defining durability, migration, and native synchronization ownership. |
| Hotkeys | Later, desktop capability only | Command palette, search, add/import, connect/disconnect, and speed-test commands | Hotkeys handles scopes, conflicts, input filtering, sequences, and platform-aware labels, but is currently alpha ([Hotkeys overview](https://tanstack.com/hotkeys/latest/docs/overview)). Do not ship mobile-only dead UI; register and display bindings only where a hardware keyboard capability is available. |

### What these libraries do not solve

- Query can expose pending/background state, but it does not move CPU-heavy subscription parsing off the UI thread.
- Pacer can control when work runs, but it does not make a large synchronous parse cheaper.
- Virtual reduces DOM/render cost, not parsing, persistence, or sorting cost.
- Store is not a replacement for the repository, Query cache, or router state.
- DB should not be introduced until it has one clear persistence/synchronization authority.

For large subscription payloads, fetch with Query, parse in a Web Worker on web/desktop-webview or a native background worker where the platform adapter supports it, commit the resulting batch atomically, then invalidate the profile/subscription queries. Render a small refresh indicator from fetch/mutation state and keep the previous list visible.

## Recommended delivery sequence

1. Preserve the current canonical schema, registry, and engine builders; add `ConversionResult` and semantic round-trip tests to each supported protocol.
2. Build the subscription editor with TanStack Form. Keep source URL and child profiles separate.
3. Build a schema-driven profile editor from protocol/transport/security capability descriptors. Start with the protocols RahRow can both parse, serialize, and compile for the selected engine.
4. Add advanced canonical JSON with diff + validation. Do not label it “Xray JSON.”
5. Add a separate raw Xray/sing-box document editor only with engine version selection, syntax/schema validation, secret-safe display, atomic save, and a clear portability warning.
6. Move subscription fetch/refresh to Query and CPU-heavy parse to a worker/native job; retain previous data during background refresh.
7. Virtualize the flattened connection view only after measuring list size/render cost.
8. Evaluate Pacer for search and bounded speed-test queues. Defer DB and Hotkeys until their concrete acceptance criteria exist.

## Acceptance tests

- For every supported share scheme: URI → profile → URI → profile yields semantically equal canonical profiles.
- Aliases/default normalization reports `normalized`, not `lossless`, when textual representation changes.
- Unsupported/unknown fields survive in the source extension/raw envelope or appear in `unrepresentedFields`; none disappear silently.
- A full Xray document with DNS, routes, or multiple outbounds cannot be exported as one URL without a lossy-conversion confirmation.
- Generated Xray and sing-box configurations validate against the bundled engine versions.
- Changing protocol or transport never silently discards populated fields.
- Secrets never appear in errors, logs, toasts, analytics, snapshots, or conversion reports.
- Subscription refresh keeps existing rows usable, shows background state, supports cancellation/supersession, and commits atomically.
- Large lists remain keyboard accessible and preserve focus/selection when virtualized.

