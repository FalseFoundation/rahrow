# RahRow Testing and Done Criteria

## Testing Strategy

Use Vitest. Do not introduce another test framework.

Tests should focus on behavior and architecture boundaries. High-value targets:

- protocol parsing
- URL serialization
- normalization
- validation
- subscription parsing
- Xray configuration generation
- connection state transitions
- VPN-default and explicit-proxy-fallback transitions
- OS proxy activation rollback and restoration
- storage serialization/deserialization
- latency result handling

Add UI tests when behavior is non-trivial. Do not test every trivial wrapper.

## Lightweight TDD

Use lightweight TDD for critical behavior:

```text
Fail -> Implement -> Pass -> Refactor
```

Apply this especially to VLESS parser, VMess parser, Trojan parser, serializers, normalization, Xray config generation, subscription parsing, and connection lifecycle.

Protocol tests should become executable specifications.

## Test Organization

Keep tests close to implementation where practical:

```text
packages/protocols/src/vless/parser.ts
packages/protocols/src/vless/parser.test.ts
```

Avoid a giant unrelated top-level `tests/` directory. Integration tests may live at app/package boundaries when that is where the behavior exists.

## Security-Sensitive Inputs

Prioritize malformed-input tests:

- malformed VLESS URLs
- invalid UUIDs
- missing host
- invalid ports
- malformed VMess base64
- invalid JSON
- malformed Trojan URLs
- unsupported transports
- invalid subscription entries
- malicious or garbage input

Parsers must fail safely.

## Definition of Done

RahRow migration/implementation is complete when:

- the repository is substantially smaller and understandable by one developer
- obsolete packages and unnecessary frameworks/infrastructure are removed
- no backend infrastructure remains
- TypeScript owns the domain
- Xray owns proxy networking behind an engine interface
- Tauri owns desktop native integration
- Capacitor owns mobile bridging
- Android/iOS native VPN integration is isolated
- CLI shares the same domain logic
- VLESS, VMess, and Trojan are supported
- subscriptions work
- URL import/export works
- clipboard import/export works
- QR import/export works
- sharing works
- latency testing exists
- local persistence exists
- application state is cleanly separated
- ads have only an optional extension point and do not contaminate core
- future engines can implement `ProxyEngine`
- production distributables bundle every engine shown to users
- VPN/TUN is the persisted default and connects only through a real registered
  platform tunnel
- system proxy is an explicit fallback and is restored on disconnect or failure
- unavailable native tunnel support fails closed with actionable diagnostics
- users can select a compatible bundled engine without reinstalling
- release checks fail when a required engine artifact is missing or has the
  wrong checksum
- protocol support claims match executable schema/import/config/integration
  tests rather than upstream engine feature lists
- meaningful tests exist around protocol/configuration boundaries
- Vitest is the only test runner
- dependency graph remains shallow
- there are no meaningless packages or empty architectural placeholders
- desktop/mobile do not duplicate domain logic
- desktop and mobile product UI is identical and driven by `packages/features`
- feature UI uses colocated CSS Modules rather than duplicated app stylesheets
